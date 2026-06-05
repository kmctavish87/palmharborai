# Resume Tailor

Resume Tailor is the Dockerized Streamlit app behind `https://palmharborai.com/apply`.

## Local Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
RESUME_TAILOR_PUBLIC=true \
RESUME_SOURCE_FOLDER=resume_templates \
OUTPUT_FOLDER=/tmp/resume-tailor-exports \
streamlit run app.py --server.baseUrlPath=apply
```

Open:

```text
http://localhost:8501/apply
```

## Deploy

Deploy this folder as a Docker web service. The container serves Streamlit on `/apply`.

Set these environment variables on the host:

```text
BASE_URL_PATH=apply
RESUME_TAILOR_PUBLIC=true
RESUME_SOURCE_FOLDER=/app/resume_templates
OUTPUT_FOLDER=/tmp/resume-tailor-exports
RESUME_TAILOR_ACCESS_CODE=<private access code>
```

After the host gives you an origin URL, set `RESUME_TAILOR_ORIGIN` in the Palm Harbor AI Cloudflare Worker to that origin.
