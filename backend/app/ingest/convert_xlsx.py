"""
Step 1: Convert DAIL Excel files to clean CSVs with data quality fixes applied.
Run once before seeding: python -m app.ingest.convert_xlsx (from backend/ directory)
"""
import pandas as pd
import re
import os

# Resolve data/ relative to project root: backend/app/ingest/ -> up 3 -> dail-knowledge-graph/data/
DATA_DIR = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "data")
)


def make_slug(caption, numeric_id):
    """Generate a URL-safe slug from case caption, using numeric id as suffix."""
    if pd.isna(caption):
        return f"case-{int(numeric_id)}"
    s = str(caption).lower()
    s = re.sub(r"[^a-z0-9\s]", "", s)
    s = re.sub(r"\s+", "-", s.strip())
    s = s[:60].rstrip("-")
    return s or f"case-{int(numeric_id)}"


def convert_cases():
    print("Converting Case table...")
    df = pd.read_excel(f"{DATA_DIR}/Case_Table_2026-Feb-21_1952.xlsx")

    # Fix 1: Fill missing Case_snug with generated slug
    missing_slug = df["Case_snug"].isnull()
    df.loc[missing_slug, "Case_snug"] = df[missing_slug].apply(
        lambda r: make_slug(r["Caption"], r["id"]), axis=1
    )
    print(f"  Generated slugs for {missing_slug.sum()} cases missing Case_snug")

    # Fix 2: Normalize Status_Disposition (e.g. lowercase 'active' -> 'Active')
    df["Status_Disposition"] = df["Status_Disposition"].astype(str).str.strip().str.title()

    # Fix 3: Normalize binary field
    df["Published_Opinions_binary"] = df["Published_Opinions_binary"].fillna(0).astype(int)

    # Fix 4: Ensure id is always an integer
    df["id"] = df["id"].fillna(0).astype(int)

    # Fix 5: Strip whitespace from key text fields
    for col in ["Caption", "Brief_Description", "Jurisdiction_Filed", "Current_Jurisdiction"]:
        if col in df.columns:
            df[col] = df[col].fillna("").astype(str).str.strip()

    df.to_csv(f"{DATA_DIR}/dail_cases.csv", index=False)
    print(f"  Wrote {len(df)} rows to dail_cases.csv")
    return df


def convert_dockets():
    print("Converting Docket table...")
    df = pd.read_excel(f"{DATA_DIR}/Docket_Table_2026-Feb-21_2003.xlsx")
    df["Case_Number"] = df["Case_Number"].fillna(0).astype(int)
    df["id"] = df["id"].fillna(0).astype(int)
    df["link"] = df["link"].fillna("").astype(str).str.strip()
    df.to_csv(f"{DATA_DIR}/dail_dockets.csv", index=False)
    print(f"  Wrote {len(df)} rows to dail_dockets.csv")


def convert_documents():
    print("Converting Document table...")
    df = pd.read_excel(f"{DATA_DIR}/Document_Table_2026-Feb-21_2002.xlsx")
    df["Case_Number"] = df["Case_Number"].fillna(0).astype(int)
    df["id"] = df["id"].fillna(0).astype(int)
    df["link"] = df["link"].fillna("").astype(str).str.strip()
    df["date"] = (
        pd.to_datetime(df["date"], errors="coerce")
        .dt.strftime("%Y-%m-%d")
        .fillna("")
    )
    df["cite_or_reference"] = df["cite_or_reference"].fillna("").astype(str).str.strip()
    df["document"] = df["document"].fillna("").astype(str).str.strip()
    df.to_csv(f"{DATA_DIR}/dail_documents.csv", index=False)
    print(f"  Wrote {len(df)} rows to dail_documents.csv")


def convert_secondary_sources():
    print("Converting Secondary Source table...")
    df = pd.read_excel(
        f"{DATA_DIR}/Secondary_Source_Coverage_Table_2026-Feb-21_2058.xlsx"
    )
    df["Case_Number"] = df["Case_Number"].fillna(0).astype(int)
    df["id"] = df["id"].fillna(0).astype(int)
    df["Secondary_Source_Link"] = (
        df["Secondary_Source_Link"].fillna("").astype(str).str.strip()
    )
    df["Secondary_Source_Title"] = (
        df["Secondary_Source_Title"].fillna("").astype(str).str.strip()
    )
    df.to_csv(f"{DATA_DIR}/dail_secondary_sources.csv", index=False)
    print(f"  Wrote {len(df)} rows to dail_secondary_sources.csv")


if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)

    # Verify Excel files exist before starting
    expected = [
        "Case_Table_2026-Feb-21_1952.xlsx",
        "Docket_Table_2026-Feb-21_2003.xlsx",
        "Document_Table_2026-Feb-21_2002.xlsx",
        "Secondary_Source_Coverage_Table_2026-Feb-21_2058.xlsx",
    ]
    missing = [f for f in expected if not os.path.exists(f"{DATA_DIR}/{f}")]
    if missing:
        print("ERROR: Missing Excel files in data/:")
        for f in missing:
            print(f"  MISSING: {f}")
        print("\nPlace all four Excel files in the data/ directory and re-run.")
        raise SystemExit(1)

    cases_df = convert_cases()
    convert_dockets()
    convert_documents()
    convert_secondary_sources()

    print("\nAll CSVs written. Data quality fixes applied:")
    print("  OK: Generated slugs for missing Case_snug values")
    print("  OK: Normalized Status_Disposition capitalization")
    print("  OK: Cleaned whitespace across text fields")
    print("  OK: Standardized date formats to YYYY-MM-DD")
    print("\nRun next: python -m app.ingest.seed_from_excel")
