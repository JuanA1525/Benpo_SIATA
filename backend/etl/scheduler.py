from apscheduler.schedulers.background import BackgroundScheduler
import atexit

def start_scheduler():
    """Inicializar el scheduler para ETL"""
    scheduler = BackgroundScheduler()

    # Por ahora solo un job de prueba cada 10 minutos
    # scheduler.add_job(
    #     func=collect_data,
    #     trigger="interval",
    #     minutes=10,
    #     id='etl_job'
    # )

    scheduler.start()
    print("✅ Scheduler iniciado")

    # Apagar el scheduler cuando la aplicación termine
    atexit.register(lambda: scheduler.shutdown())

def collect_data():
    """Función placeholder para ETL"""
    print("🔄 Ejecutando ETL...")
    # Aquí irá la lógica de ETL