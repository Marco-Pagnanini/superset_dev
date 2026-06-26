FROM trinodb/trino:479

USER root

RUN curl -L https://github.com/nineinchnick/trino-openapi/releases/download/v1.85/trino-openapi-1.85.zip \
    -o /tmp/trino-openapi.zip && \
    mkdir -p /tmp/trino-openapi-extract && \
    cd /tmp/trino-openapi-extract && \
    jar xf /tmp/trino-openapi.zip && \
    mv /tmp/trino-openapi-extract/trino-openapi-1.85 /usr/lib/trino/plugin/trino-openapi && \
    rm -rf /tmp/trino-openapi.zip /tmp/trino-openapi-extract

USER trino