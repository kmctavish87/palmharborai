from __future__ import annotations

import os

import streamlit as st

from resume_tailor import (
    OUTPUT_FOLDER,
    RESUME_SOURCE_FOLDER,
    ResumeTailorError,
    ScrapeError,
    build_ai_preview,
    build_ai_tailoring_plan,
    build_preview,
    export_tailored_documents,
    extract_job_text_from_url,
    parse_job_description,
    scan_resume_files,
    select_best_resume_match,
)


st.set_page_config(page_title="Resume Tailor", page_icon="RT", layout="wide")

ACCESS_CODE = os.getenv("RESUME_TAILOR_ACCESS_CODE", "").strip()
PUBLIC_DEPLOYMENT = os.getenv("RESUME_TAILOR_PUBLIC", "").lower() in {"1", "true", "yes"}


def require_access_code() -> None:
    if not ACCESS_CODE:
        return
    if st.session_state.get("authenticated"):
        return
    st.title("Resume Tailor")
    entered = st.text_input("Access code", type="password")
    if entered == ACCESS_CODE:
        st.session_state.authenticated = True
        st.rerun()
    st.info("Enter the access code to continue.")
    st.stop()


require_access_code()

st.title("Resume Tailor")
st.caption("Generate a job-specific resume from your existing formatted Word resumes.")


def initialize_state() -> None:
    defaults = {
        "job_text": "",
        "job": None,
        "plan": None,
        "selected_resume": None,
        "preview": None,
        "scrape_failed": False,
    }
    for key, value in defaults.items():
        st.session_state.setdefault(key, value)


def create_output_folder() -> bool:
    try:
        OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)
    except OSError:
        return False
    return True


def template_count() -> int:
    try:
        return len(scan_resume_files())
    except ResumeTailorError:
        return 0


initialize_state()

with st.sidebar:
    st.subheader("App status")
    if PUBLIC_DEPLOYMENT:
        st.write("Resume templates")
        st.code(f"{template_count()} packaged templates", language=None)
        st.write("Exports")
        st.code("Generated per request with download links", language=None)
    else:
        st.write("Resume source")
        st.code(str(RESUME_SOURCE_FOLDER), language=None)
        st.write("Generated output")
        st.code(str(OUTPUT_FOLDER), language=None)

    if not OUTPUT_FOLDER.exists():
        try:
            OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)
        except OSError:
            st.error("Output folder does not exist and could not be created.")
    else:
        st.success("Output folder is ready.")

    st.divider()
    st.write("Notes")
    st.write(
        "Paste a job URL first. If the site blocks automated reading, paste the full job description. "
        "OpenAI handles parsing, ATS keywords, and resume tailoring when OPENAI_API_KEY is configured."
    )


left, right = st.columns([1.05, 0.95], gap="large")

with left:
    st.subheader("1. Job Input")
    job_url = st.text_input("Job posting URL", placeholder="https://company.com/jobs/...")
    fetch_clicked = st.button("Fetch Job Description", type="primary")

    if fetch_clicked:
        try:
            with st.spinner("Reading the job posting..."):
                st.session_state.job_text = extract_job_text_from_url(job_url)
                st.session_state.scrape_failed = False
                st.success("Job posting text extracted.")
        except ScrapeError as exc:
            st.session_state.scrape_failed = True
            st.warning(str(exc))

    st.session_state.job_text = st.text_area(
        "Job description",
        value=st.session_state.job_text,
        height=360,
        placeholder="Paste the full job description here if the URL cannot be read.",
    )
    if st.session_state.job_text:
        with st.expander("Extracted job text", expanded=False):
            st.text_area("Extracted text", value=st.session_state.job_text, height=260)

    if st.button("Generate Tailored Resume Preview", disabled=not st.session_state.job_text.strip()):
        try:
            with st.spinner("Reading the job, extracting ATS keywords, and tailoring the resume..."):
                parsed_job = parse_job_description(st.session_state.job_text, source_url=job_url)
                resume_files = scan_resume_files()
                selected = select_best_resume_match(parsed_job, resume_files)
                try:
                    plan = build_ai_tailoring_plan(st.session_state.job_text, selected)
                    job = plan.job
                    preview = build_ai_preview(plan, selected)
                except Exception as api_exc:
                    plan = None
                    job = parsed_job
                    preview = build_preview(job, selected)
                    st.warning(
                        "OpenAI tailoring is unavailable right now, so the app is using the local fallback. "
                        f"Details: {api_exc}"
                    )
                st.session_state.job = job
                st.session_state.plan = plan
                st.session_state.selected_resume = selected
                st.session_state.preview = preview
            st.success("Preview is ready.")
        except ResumeTailorError as exc:
            st.error(str(exc))

with right:
    st.subheader("2. Preview")

    preview = st.session_state.preview
    job = st.session_state.job
    selected = st.session_state.selected_resume
    plan = st.session_state.plan

    if not preview:
        st.info("Paste or fetch a job description, then build the preview.")
    else:
        detail_cols = st.columns(2)
        detail_cols[0].write("Job title")
        detail_cols[0].subheader(str(preview["job_title"]))
        detail_cols[1].write("Company")
        detail_cols[1].subheader(str(preview["company"]))

        st.write("Selected base resume")
        st.code(preview["selected_resume"], language=None)

        st.write("Top matched keywords")
        st.write(", ".join(preview["matched_keywords"]) or "No strong keyword overlap found.")

        st.write("Missing keywords added")
        st.write(
            ", ".join(preview["missing_keywords_added"])
            or "No missing keywords can be truthfully added from the selected resume."
        )

        st.write("Final resume length estimate")
        st.info(preview["length_estimate"])

        st.divider()
        export_cols = st.columns(2)
        export_resume = export_cols[0].button("Export Resume", type="primary")
        export_bundle = export_cols[1].button("Export Resume + Cover Letter")

        if export_resume or export_bundle:
            if not OUTPUT_FOLDER.exists() and not create_output_folder():
                st.error(f"Output folder does not exist: {OUTPUT_FOLDER}")
            elif not job or not selected:
                st.error("Build the preview before exporting.")
            else:
                try:
                    with st.spinner("Writing formatted Word documents..."):
                        artifacts = export_tailored_documents(
                            job,
                            selected,
                            include_cover_letter=export_bundle,
                            plan=plan,
                        )
                    st.success("Export complete.")
                    st.write("Resume")
                    if PUBLIC_DEPLOYMENT:
                        st.download_button(
                            "Download Resume",
                            data=artifacts.resume_path.read_bytes(),
                            file_name=artifacts.resume_path.name,
                            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        )
                    else:
                        st.code(str(artifacts.resume_path), language=None)
                    if artifacts.cover_letter_path:
                        st.write("Cover letter")
                        if PUBLIC_DEPLOYMENT:
                            st.download_button(
                                "Download Cover Letter",
                                data=artifacts.cover_letter_path.read_bytes(),
                                file_name=artifacts.cover_letter_path.name,
                                mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                            )
                        else:
                            st.code(str(artifacts.cover_letter_path), language=None)
                    st.write(f"Length check: {artifacts.length_estimate}")
                except ResumeTailorError as exc:
                    st.error(str(exc))
                except Exception as exc:
                    st.error(f"The resume could not be exported: {exc}")


with st.expander("What this first version changes"):
    st.write(
        "The app selects the closest existing resume, edits that DOCX in place, reorders existing bullets and skills, "
        "updates the headline and summary, and saves the final document into the generated resumes folder."
    )
    st.write(
        "It does not invent employers, dates, degrees, tools, or metrics. Keyword additions are limited to language "
        "already found in your selected source resume."
    )
