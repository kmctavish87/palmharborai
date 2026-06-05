FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV RESUME_TAILOR_PUBLIC=true
ENV RESUME_SOURCE_FOLDER=/app/resume_templates
ENV OUTPUT_FOLDER=/tmp/resume-tailor-exports

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py resume_tailor.py ./
COPY resume_templates ./resume_templates

EXPOSE 8501

CMD ["sh", "-c", "streamlit run app.py --server.address=0.0.0.0 --server.port=${PORT:-8501} --server.baseUrlPath=${BASE_URL_PATH:-apply} --server.headless=true --server.enableCORS=false --server.enableXsrfProtection=false --server.enableWebsocketCompression=false --browser.gatherUsageStats=false"]
