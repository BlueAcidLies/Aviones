const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const mysql = require("mysql2");

// Middleware
app.use(bodyParser.json());

// Configuración de la conexión a la base de datos MySQL:
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Noa95lokA",
    database: "rutas_aviones"
});

// Conectamos la base de datos:
connection.connect((err) => {
    if (err) {
        console.error("Error al conectar con la base de datos: ", err);
        process.exit(1);
    }
    console.log("Conexión establecida con la base de datos");
});

// Middleware para manejar errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Error en el servidor');
});

app.get("/ruta", (req, res) => {
    console.log(`entramos a las rutas`);
    const origen = req.query.origen;
    const destino = req.query.destino;

    if (!origen || !destino) {
        return res.status(400).json({ error: "Las ciudades de origen y destino son requeridas." });
    }
    console.log(`salimos de las rutas`);

    // Seleccionamos la lista de ciudades de la base de datos:
    connection.query("SELECT nombre FROM ciudades", (err, result) => {
        if (err) {
            console.error("Error fetching cities from the database:", err);
            return res.status(500).json({ error: "Error fetching cities from the database" });
        }

        const ciudades = result.map(row => row.nombre);
        
        // Validamos si las ciudades de origen y destino existen en la base de datos:
        if (!ciudades.includes(origen) || !ciudades.includes(destino)) {
            return res.status(404).json({ error: "Las ciudades de origen y/o destino no existen." });
        }

        connection.query("SELECT * FROM conexiones", (err, result) => {
            if (err) {
                console.error("Error fetching cities from the database:", err);
                return res.status(500).json({ error: "Error fetching cities from the database" });
            }

            const conexiones = result;
            var idCiudad;
            var idDestino;

            conexiones.forEach(element => {
                if(element.ciudad_origen==origen)
                    idCiudad = element.id;
                if(element.ciudad_destino == destino)
                    idDestino = element.id;
            });

            if (!conexiones.includes(idCiudad) || !conexiones.includes(idDestino)) {
                return res.status(404).json({ error: "La conexion no existe." });
            }

            // Pasamos la lista de ciudades a la función de dijkstra:
            dijkstra(ciudades, origen, destino)
                .then(siguiente_destino => {
                    res.json({ siguiente_destino });
                })
                .catch(error => {
                    console.error("Error al buscar la ruta:", error.message);
                    res.status(500).json({ error: "Error al buscar la ruta." });
                });
        });
    });
});

function dijkstra(ciudades, origen, destino) {
    const conexiones = {};
    const visitados = {};
    const distancias = {};
    const predecesores = {};

    // Inicialización de distancias y predecesores
    for (const ciudad of ciudades) {
        distancias[ciudad] = Infinity;
        predecesores[ciudad] = null;
        visitados[ciudad] = false;
        conexiones[conexiones] = {};
    }

    // Llenamos de conexiones con los pesos de las ciudades adyacentes:
    for (const ciudad of ciudades) {
        for (const conexion of ciudades) {
            if (ciudad !== conexion) {
                const peso = calcularPeso(ciudad, conexion);
                conexiones[ciudad][conexion] = peso;
            }
        }
    }

    distancias[origen] = 0;

    return new Promise((resolve, reject) => {
        while (true) {
            let nodoActual = null;
            let distanciaMinima = Infinity;

            // Buscar el nodo no visitado con la menor distancia mínima:
            for (const ciudad of ciudades) {
                if (!visitados[ciudad] && distancias[ciudad] < distanciaMinima) {
                    nodoActual = ciudad;
                    distanciaMinima = distancias[ciudad];
                }
            }

            if (nodoActual === null) break;

            visitados[nodoActual] = true;

            // Actualizamos las distancias de los vecinos no visitados del nodo actual:
            for (const vecino in conexiones[nodoActual]) {
                const peso = conexiones[nodoActual][vecino];
                const distanciaTotal = distancias[nodoActual] + peso;
                if (distanciaTotal < distancias[vecino]) {
                    distancias[vecino] = distanciaTotal;
                    predecesores[vecino] = nodoActual;
                }
            }
        }

        // Reconstruimos el camino mínimo desde el destino hasta el origen:
        const rutaMinima = [];
        let nodo = destino;
        while (nodo !== null) {
            rutaMinima.unshift(nodo);
            nodo = predecesores[nodo];
        }

        resolve(rutaMinima);
    });
}

function calcularPeso(ciudadOrigen, ciudadDestino) {
    // Realizamos la consulta a la base de datos:
    const query = "SELECT tiempo FROM conexiones WHERE ciudad_origen = ? AND ciudad_destino = ?";
    return new Promise((resolve, reject) => {
        connection.query(query, [ciudadOrigen, ciudadDestino], (err, result) => {
            if (err) {
                console.error("Error en la consulta de calcularPeso:", err);
                reject(err); // Rechazar la promesa con el error real
            } else {
                if (result.length === 0 || !result[0].tiempo) {
                    console.error("No connection found between", ciudadOrigen, "and", ciudadDestino);
                    resolve(Infinity);
                } else {
                    resolve(result[0].tiempo);
                }
            }
        });
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});