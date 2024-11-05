// 1. invocar express 
const express = require('express');
const app = express();

const bcryptjs = require('bcryptjs');

const fileUpload = require('express-fileupload');
app.use(fileUpload());


// 2. Setear urlencode para capturar datos form
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// 3. invocar dotenv
const dotenv = require('dotenv');
dotenv.config({ path: './env/.env' });

// 4. directorio public
app.use('/resource', express.static('public'));
app.use('/resource', express.static(__dirname + '/public'));

// 5. - Establece el motor de plantillas ejs
app.set('view engine', 'ejs');

// 6. - Invocamos el bcryptJS
const bcryptJS = require('bcryptjs');

// 7. - Var. de session
const session = require('express-session');
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true,
}));

// 8. - Invocar modulo de conexion
const connection = require('./databse/db.js');

// 9. - Establecer las rutas
app.get('/login', (req, res) => {
    res.render('login')
});

app.get('/register', (req, res) => {
    res.render('register')
});

// 10. - Register
app.post('/register', async (req, res) => {
    const user = req.body.user;
    const name = req.body.name;
    const email = req.body.email;
    const address = req.body.address;
    const rol = req.body.rol;
    const pass = req.body.pass;

    // Verificar si el usuario ya existe
    connection.query('SELECT * FROM users WHERE user = ?', [user], async (error, results) => {
        if (error) {
            console.log(error);
            return res.render('register', {
                alert: true,
                alertTitle: "Database Error",
                alertMessage: "Error while checking for user existence.",
                alertIcon: 'error',
                showConfirmButton: true,
                timer: false,
                ruta: ''
            });
        }

        if (results.length > 0) {
            // Si el usuario ya existe
            return res.render('register', {
                alert: true,
                alertTitle: "User Exists",
                alertMessage: "Username already taken. Please choose another.",
                alertIcon: 'warning',
                showConfirmButton: true,
                timer: false,
                ruta: ''
            });
        } else {
            // Si el usuario no existe, procedemos a registrarlo
            let passwordHaash = await bcryptjs.hash(pass, 10);
            connection.query('INSERT INTO users SET ?', { user: user, name: name, email: email, address: address, rol: rol, pass: passwordHaash }, async (error, result) => {
                if (error) {
                    console.log(error);
                } else {
                    res.render('register', {
                        alert: true,
                        alertTitle: "Registration",
                        alertMessage: "Successful Registration!",
                        alertIcon: 'success',
                        showConfirmButton: false,
                        timer: 2500,
                        ruta: ''
                    });
                }
            });
        }
    });
});


// 11. - Autenticación
// Modificación en el proceso de autenticación para asegurar una sesión limpia y redirigir según el rol
app.post('/auth', async (req, res) => {
    const user = req.body.user;
    const pass = req.body.pass;

    if (user && pass) {
        connection.query('SELECT * FROM users WHERE user = ?', [user], async (error, results) => {
            if (results.length == 0 || !(await bcryptjs.compare(pass, results[0].pass))) {
                res.render('login', {
                    alert: true,
                    alertTitle: "Error",
                    alertMessage: "USER OR PASSWORD INCORRECT!",
                    alertIcon: 'error',
                    showConfirmButton: true,
                    timer: false,
                    ruta: 'login'
                });
            } else {
                // Reiniciar sesión para limpiar datos anteriores
                req.session.regenerate((err) => {
                    if (err) console.log("Error regenerating session:", err);
                    req.session.loggedin = true;
                    req.session.user_id = results[0].user_id;
                    req.session.name = results[0].name;
                    req.session.rol = results[0].rol.trim(); // Aseguramos que no haya espacios

                    console.log("Rol asignado en sesión:", req.session.rol); // Confirmación en consola

                    // Redirigir según el rol del usuario
                    if (req.session.rol === 'taller') {
                        res.redirect('/');
                    } else if (req.session.rol === 'aseguradora') {
                        res.redirect('interaseg');
                    } else {
                        // Si el rol no coincide con los permitidos
                        res.render('login', {
                            alert: true,
                            alertTitle: "Access Denied",
                            alertMessage: "Your role does not have a specific view.",
                            alertIcon: 'error',
                            showConfirmButton: true,
                            timer: false,
                            ruta: 'login'
                        });
                    }
                });
            }
        });
    } else {
        res.render('login', {
            alert: true,
            alertTitle: "Warning!",
            alertMessage: "Please enter a username or password!",
            alertIcon: 'warning',
            showConfirmButton: false,
            timer: 1500,
            ruta: 'login'
        });
    }
});

// 12. - Rutas protegidas por rol
// Ruta para intertaller, solo accesible para usuarios con rol 'taller'
app.get('/', (req, res) => {
    if (req.session.loggedin && req.session.rol === 'taller') {
        // Consultar aseguradoras
        connection.query('SELECT user_id, name FROM users WHERE rol = "aseguradora"', (error, aseguradoras) => {
            if (error) {
                console.log(error);
                res.redirect('/'); // Manejar el error redirigiendo o mostrando un mensaje de error
            } else {
                // Renderizar la vista con las aseguradoras disponibles
                res.render('intertaller', {
                    login: true,
                    name: req.session.name,
                    aseguradoras: aseguradoras // Pasar las aseguradoras a la vista
                });
            }
        });
    } else {
        res.render('login', {
            alert: true,
            alertTitle: "Access Denied",
            alertMessage: "You do not have permission to access this page.",
            alertIcon: 'error',
            showConfirmButton: true,
            timer: false,
            ruta: 'login'
        });
    }
});


// Ruta para interaseg, solo accesible para usuarios con rol 'aseguradora'
app.get('/interaseg', (req, res) => {
    if (req.session.loggedin && req.session.rol === 'aseguradora') {
        // Consultar los presupuestos asignados a la aseguradora
        connection.query(`
            SELECT budgets.budget_id, budgets.vehicle_make, budgets.vehicle_model, budgets.license_plate, 
                   budgets.owner_name, budgets.owner_phone, budgets.work_value, 
                   users.name AS taller_name
            FROM budgets 
            INNER JOIN users ON budgets.user_id = users.user_id 
            WHERE budgets.insurance_company_id = ?`, [req.session.user_id], (error, presupuestos) => {
            if (error) {
                console.log(error);
                res.redirect('/');
            } else {
                res.render('interaseg', {
                    login: true,
                    name: req.session.name,
                    presupuestos: presupuestos,
                    presupuesto: {} // Pasamos un presupuesto vacío por defecto
                });
            }
        });
    } else {
        res.render('login', {
            alert: true,
            alertTitle: "Access Denied",
            alertMessage: "You do not have permission to access this page.",
            alertIcon: 'error',
            showConfirmButton: true,
            timer: false,
            ruta: 'login'
        });
    }
});


const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

app.post('/crearPresupuesto', async (req, res) => {
    const {
        vehicle_make, vehicle_model, license_plate, owner_name, owner_surname,
        owner_dni, owner_phone, insurance_company_id, work_description,
        work_value, start_date, end_date
    } = req.body;

    const repair_parts = Array.isArray(req.body.repair_parts) ? req.body.repair_parts.join(', ') : req.body.repair_parts;
    let compressedPhotos = [];
    let pdfDataBuffer = null;

    if (req.files && req.files.before_photos) {
        const files = Array.isArray(req.files.before_photos) ? req.files.before_photos : [req.files.before_photos];

        for (let file of files) {
            if (file.mimetype.startsWith('image/')) {
                // Procesa imágenes usando Sharp
                const compressedPhoto = await sharp(file.data)
                    .resize({ width: 800 })
                    .jpeg({ quality: 70 })
                    .toBuffer();
                compressedPhotos.push({ data: compressedPhoto, type: 'image' });
            } else if (file.mimetype === 'application/pdf') {
                // Almacena el PDF directamente en la variable como datos binarios
                pdfDataBuffer = file.data;
            } else {
                console.log("Formato de archivo no compatible:", file.mimetype);
            }
        }
    }

    // Inserta los datos en la tabla `budgets`
    const query = `INSERT INTO budgets (user_id, vehicle_make, vehicle_model, license_plate,
                   owner_name, owner_surname, owner_dni, owner_phone, insurance_company_id, 
                   repair_parts, work_description, work_value, start_date, end_date, before_photos) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    connection.query(query, [
        req.session.user_id, vehicle_make, vehicle_model, license_plate,
        owner_name, owner_surname, owner_dni, owner_phone, insurance_company_id,
        repair_parts, work_description, work_value, start_date, end_date, JSON.stringify(compressedPhotos)
    ], (error, results) => {
        if (error) {
            console.log("Error al crear presupuesto:", error);
            return res.redirect('/');
        }

        const budgetId = results.insertId;

        // Si hay un PDF, guárdalo en `budget_pdfs` como datos binarios
        if (pdfDataBuffer) {
            const pdfQuery = `INSERT INTO budget_pdfs (budget_id, pdf_data) VALUES (?, ?)`;
            connection.query(pdfQuery, [budgetId, pdfDataBuffer], (pdfError) => {
                if (pdfError) {
                    console.error("Error al guardar PDF en la base de datos:", pdfError);
                }
                res.redirect('/');
            });
        } else {
            res.redirect('/');
        }
    });
});



// Nueva ruta para obtener los datos de presupuesto según el ID
app.get('/obtenerPresupuesto/:id', (req, res) => {
    const budgetId = req.params.id;

    connection.query(`
        SELECT budgets.*, users.name AS taller_name
        FROM budgets
        INNER JOIN users ON budgets.user_id = users.user_id
        WHERE budgets.budget_id = ?`, [budgetId], (error, results) => {
        if (error) {
            console.log("Error al obtener el presupuesto:", error);
            return res.status(500).send("Error al obtener los datos del presupuesto");
        }

        if (results.length === 0) {
            console.log("Presupuesto no encontrado para el ID:", budgetId);
            return res.status(404).send("Presupuesto no encontrado");
        }

        const presupuesto = results[0];
        presupuesto.before_photos = JSON.parse(presupuesto.before_photos); // Convertir de JSON a objeto

        // Convertir imágenes a base64
        presupuesto.before_photos = presupuesto.before_photos.map(photo => {
            if (photo.type === 'image') {
                return {
                    ...photo,
                    data: Buffer.from(photo.data).toString('base64')
                };
            }
            return photo;
        });

        if (req.files && req.files.before_photos) {
            const files = Array.isArray(req.files.before_photos) ? req.files.before_photos : [req.files.before_photos];

            for (let file of files) {
                if (file.mimetype === 'application/pdf') {
                    // Guardar el PDF en la base de datos
                    const pdfData = file.data; // Datos binarios del PDF
                    const query = `INSERT INTO budget_pdfs (budget_id, pdf_data) VALUES (?, ?)`;
                    connection.query(query, [budgetId, pdfData], (pdfError) => {
                        if (pdfError) {
                            console.error("Error al guardar PDF en la base de datos:", pdfError);
                        }
                    });
                }
            }
        }

        res.json(presupuesto);
    });
});

// Ruta para obtener PDF en base64
app.get('/obtenerPDF/:id', (req, res) => {
    const budgetId = req.params.id;

    connection.query(`SELECT pdf_data FROM budget_pdfs WHERE budget_id = ?`, [budgetId], (error, results) => {
        if (error) {
            console.log("Error al obtener el PDF:", error);
            return res.status(500).json({ error: "Error al obtener el PDF" });
        }

        if (results.length === 0) {
            return res.json({ pdfData: null });
        }

        // Convertir el PDF a base64 y enviarlo con el prefijo adecuado
        const pdfBase64 = results[0].pdf_data.toString('base64');
        res.json({ pdfData: `data:application/pdf;base64,${pdfBase64}` });
    });
});

// Ruta para obtener imágenes en base64
app.get('/obtenerImagenes/:budgetId', (req, res) => {
    const budgetId = req.params.budgetId;
    const query = `SELECT before_photos FROM budgets WHERE budget_id = ?`;

    connection.query(query, [budgetId], (error, results) => {
        if (error) {
            console.error("Error al obtener las imágenes:", error);
            return res.status(500).send("Error en el servidor");
        }
        
        if (results.length > 0) {
            // Parsear las imágenes desde JSON
            const images = JSON.parse(results[0].before_photos);

            // Convertir cada imagen a Base64 y añadir el MIME tipo
            const formattedImages = images.map((img) => {
                const imageBuffer = Buffer.from(img.data, 'binary');
                const mimeType = 'image/jpeg'; // Suponiendo formato JPEG
                const base64Image = imageBuffer.toString('base64');

                return {
                    ...img,
                    data: `data:${mimeType};base64,${base64Image}`
                };
            });

            res.json({ images: formattedImages });
        } else {
            res.json({ images: [] });
        }
    });
});


// Función para obtener el tipo MIME
function getMimeType(fileType) {
    if (fileType) {
        return fileType.toLowerCase(); // Solo llama a toLowerCase si fileType no es undefined
    } else {
        console.error("fileType es undefined");
        return ""; // o algún valor por defecto
    }
}


app.get('/interaseg/:id', (req, res) => {
    const budgetId = req.params.id;

    connection.query(`
        SELECT budgets.*, users.name AS taller_name
        FROM budgets
        INNER JOIN users ON budgets.user_id = users.user_id
        WHERE budgets.budget_id = ?`, [budgetId], (error, results) => {
        if (error) {
            console.log("Error al obtener el presupuesto:", error);
            return res.status(500).send("Error al obtener los datos del presupuesto");
        }

        if (results.length === 0) {
            console.log("Presupuesto no encontrado para el ID:", budgetId);
            return res.status(404).send("Presupuesto no encontrado");
        }

        // Decodificar las imágenes
        const presupuesto = results[0];
        presupuesto.before_photos = JSON.parse(presupuesto.before_photos); // Convertir de JSON a objeto

        // Renderiza la vista y pasa el presupuesto
        res.render('interaseg', { presupuesto });
    });
});





// 13. - Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login')
    });
});

app.listen(3000, (req, res) => {
    console.log('SERVER RUNNING IN http://localhost:3000');
});
