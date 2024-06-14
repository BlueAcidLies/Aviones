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
    password: "",
    database: "rutasaviones"
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

app.get("/ruta", async (req, res) => {
    console.log(`Entramos a las rutas`);

    const origen = req.query.origen;
    const destino = req.query.destino;
    var ciudades = [];
    var conexiones;
    var origenId;
    var destinoId;
    var idCiudad;
    var idDestino;

    if (!origen || !destino) {
        return res.status(400).json({ error: "Las ciudades de origen y destino son requeridas." });
    }

    try {
        // Traducimos el nombre del origen a su id
        origenId = await new Promise((resolve, reject) => {
            connection.query(
                "SELECT id FROM ciudades WHERE nombre = ?",
                [origen],
                (err, result) => {
                    if (err) {
                        console.error("Error fetching city ID from the database:", err);
                        reject(new Error("Error fetching city ID from the database"));
                    } else if (result.length === 0) {
                        reject(new Error("City not found"));
                    } else {
                        resolve(result[0].id);
                    }
                }
            );
        });

        // Traducimos el nombre del destino a su id
        destinoId = await new Promise((resolve, reject) => {
            connection.query(
                "SELECT id FROM ciudades WHERE nombre = ?",
                [destino],
                (err, result) => {
                    if (err) {
                        console.error("Error fetching city ID from the database:", err);
                        reject(new Error("Error fetching city ID from the database"));
                    } else if (result.length === 0) {
                        reject(new Error("City not found"));
                    } else {
                        resolve(result[0].id);
                    }
                }
            );
        });

        origenId = Number(origenId);
        destinoId = Number(destinoId);

        console.log("Esto es el origenId y el destinoId", origenId, destinoId);

        // Seleccionamos la lista de ciudades de la base de datos:
        ciudades = await new Promise((resolve, reject) => {
            connection.query("SELECT id FROM ciudades", (err, result) => {
                if (err) {
                    console.error("Error fetching cities from the database:", err);
                    reject(new Error("Error fetching cities from the database"));
                }
                resolve(result.map(row => row.id));
            });
        });

        // Validamos si las ciudades de origen y destino existen en la base de datos:
        if (!ciudades.includes(origenId) || !ciudades.includes(destinoId)) {
            return res.status(400).json({ error: "Las ciudades de origen y/o destino no existen." });
        }

        // Seleccionamos la lista de conexiones de la base de datos:
        conexiones = await new Promise((resolve, reject) => {
            connection.query("SELECT * FROM conexiones", (err, result) => {
                if (err) {
                    console.error("Error fetching connections from the database:", err);
                    reject(new Error("Error fetching connections from the database"));
                }
                resolve(result);
            });
        });

        console.log("Esta es la lista de conexiones: ", conexiones);

        conexiones.forEach(element => {
            if (element.ciudad_origen == origenId)
                idCiudad = element.id;
            if (element.ciudad_destino == destinoId)
                idDestino = element.id;
        });

        if (!idCiudad || !idDestino) {
            return res.status(404).json({ error: "La conexion no existe." });
        }

        // Pasamos la lista de ciudades a la función de dijkstra:
        const siguiente_destino = await dijkstra(ciudades, origenId, destinoId);
        console.log("Este es el siguiente destino ", siguiente_destino);
        res.json({ siguiente_destino });

    } catch (error) {
        console.error("Error al buscar la ruta:", error.message);
        res.status(500).json({ error: "Error al buscar la ruta." });
    }

    console.log("Salimos de las rutas");
});

async function dijkstra(ciudades, origen, destino) {
    // Lista de las posibles conexiones
    const conexiones = {};

    // Registro de nodos que se han visitado en el proceso de encontrar la ruta más corta. Evita leer un nodo más de una vez
    const visitados = {};

    // Distancia más corta conocida desde el nodo de origen hasta cada uno de los nodos del grafo
    const distancias = {};

    // Son aquellos sitios por los que pasará el avión para hacer el camino más corto
    const predecesores = {};

    // Inicialización de distancias y predecesores
    for (const ciudad of ciudades) {
        distancias[ciudad] = Infinity;
        predecesores[ciudad] = null;
        visitados[ciudad] = false;
        conexiones[ciudad] = {};
    }

    // Llenamos de conexiones con los pesos de las ciudades adyacentes:
    for (const ciudad of ciudades) {
        for (const conexion of ciudades) {
            if (ciudad !== conexion) {
                const peso = await calcularPeso(ciudad, conexion);
                conexiones[ciudad][conexion] = peso;
            }
        }
    }

    distancias[origen] = 0;

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
    
    rutaMinima.forEach(element => {
        console.log("Elemento dentro de rutaMinima", element);
    });

    console.log(rutaMinima);
    return rutaMinima;
}

function calcularPeso(ciudadOrigen, ciudadDestino) {
    // Realizamos la consulta a la base de datos:
    const query = "SELECT tiempo FROM conexiones WHERE ciudad_origen = ? AND ciudad_destino = ?";
    return new Promise((resolve, reject) => {
        connection.query(query, [ciudadOrigen, ciudadDestino], (err, result) => {
            if (err) {
                console.error("Error en la consulta de calcularPeso:", err);
                reject(err);
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
