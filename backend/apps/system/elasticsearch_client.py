import functools

from decouple import config
from elasticsearch import Elasticsearch


@functools.lru_cache(maxsize=1)
def get_es_client() -> Elasticsearch:
    """Return a module-level singleton Elasticsearch client.

    The ``Elasticsearch`` client is thread-safe and manages its own HTTP
    connection pool, so a single instance can safely be shared across the
    entire process.  ``lru_cache`` guarantees only one instance is created.
    """
    host = config("ELASTICSEARCH_HOST", default="http://localhost:9200")
    return Elasticsearch(hosts=[host])
