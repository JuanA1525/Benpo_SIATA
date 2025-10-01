from apscheduler.schedulers.background import BackgroundScheduler
from .data_collector import collect_wrf_forecasts
import atexit

def start_scheduler():
    """Inicializar el scheduler para ETL"""
    scheduler = BackgroundScheduler()

    # Job para recolectar pronósticos WRF cada 10 minutos
    scheduler.add_job(
        func=collect_wrf_forecasts,
        trigger="interval",
        minutes=10,
        id='wrf_forecasts_job'
    )

    # Ejecutar una vez al inicio
    collect_wrf_forecasts()

    scheduler.start()
    print("✅ Scheduler iniciado")

    # Apagar el scheduler cuando la aplicación termine
    atexit.register(lambda: scheduler.shutdown())