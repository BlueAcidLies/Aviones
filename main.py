import requests

def main():
    while True:
        origen = input("Introduce la ciudad de origen (o 'salir' para terminar): ")
        if origen.lower() == "salir":
            break
        destino = input("Introduce la ciudad de destino: ")
        
        # Iniciamos la simulación del vuelo:
        simular_vuelo(origen, destino)

def simular_vuelo(origen, destino):
    try:
        while origen != destino:
            input("Presiona Enter para avanzar al siguiente destino. ")
            
            # Realizamos la solicitud al servidor para obtener el siguiente destino:
            respuesta = requests.get("http://localhost:3000/ruta", params={"origen": origen, "destino": destino})
            if respuesta.status_code == 200:
                data = respuesta.json()
                siguiente_destino = data.get("siguiente_destino")
                if siguiente_destino:
                    print("Siguiente destino:", siguiente_destino)
                    # Actualizamos el origen para la siguiente iteración:
                    origen = siguiente_destino
                else:
                    print("No se encontró una ruta al destino.")
                    break
            else:
                print("Error al obtener la ruta del servidor:", respuesta.status_code)
    except Exception as e:
        print("Error durante la simulación del vuelo:", e)

if __name__ == "__main__":
    main()