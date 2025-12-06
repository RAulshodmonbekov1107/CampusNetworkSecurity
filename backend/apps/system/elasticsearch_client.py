from decouple import config
from elasticsearch import Elasticsearch


def get_es_client() -> Elasticsearch:
    """
    Return a configured Elasticsearch client.

    Uses ELASTICSEARCH_HOST env var when available, otherwise defaults to localhost.
    """
    host = config("ELASTICSEARCH_HOST", default="http://localhost:9200")
    return Elasticsearch(hosts=[host])


