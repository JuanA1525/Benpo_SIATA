import psycopg2
import psycopg2.extras
import os
from contextlib import contextmanager

def get_db_connection():
    """Crear conexión a la base de datos"""
    database_url = os.getenv('DATABASE_URL')
    return psycopg2.connect(database_url)

@contextmanager
def get_db_cursor():
    """Context manager para manejar conexiones y cursores"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        yield cursor
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if conn:
            cursor.close()
            conn.close()

def init_db():
    """Verificar conexión a la base de datos"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT 1")
            print("✅ Conexión a base de datos establecida")
    except Exception as e:
        print(f"❌ Error conectando a la base de datos: {e}")
        raise e