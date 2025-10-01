from apscheduler.schedulers.background import BackgroundScheduler
from .data_collector import collect_all_data
import atexit

def start_scheduler():
    """Inicializar el scheduler para ETL"""
    scheduler = BackgroundScheduler()

    # Job para recolectar todos los datos cada 10 minutos
    scheduler.add_job(
        func=collect_all_data,
        trigger="interval",
        minutes=10,
        id='data_collection_job'
    )

    # Ejecutar una vez al inicio
    collect_all_data()

    scheduler.start()
    print("✅ Scheduler iniciado")

    # Apagar el scheduler cuando la aplicación termine
    atexit.register(lambda: scheduler.shutdown())