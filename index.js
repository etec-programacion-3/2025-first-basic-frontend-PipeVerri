const API_BASE = 'http://localhost:3000';

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    const $notification = $('#notification');
    $notification.text(mensaje);
    $notification.removeClass('success error info').addClass(tipo + ' show');
    
    setTimeout(() => {
        $notification.removeClass('show');
    }, 3000);
}

async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            // Creamos un error enriquecido con status
            const error = new Error(`Error ${response.status}: ${response.statusText}`);
            error.response = { status: response.status, statusText: response.statusText };
            throw error;
        }

        const data = await response.json();
        return data;

    } catch (error) {
        // Solo mostramos notificación si no es error 404
        if (error.response?.status !== 404) {
            mostrarNotificacion(`Error: ${error.message}`, 'error');
        }

        // Re-lanzamos el error enriquecido para que buscarLibros() lo maneje
        throw error;
    }
}

// Obtener todos los libros
async function obtenerTodosLosLibros() {
    try {
        const libros = await apiRequest('/libros');
        mostrarLibros(libros);
        mostrarNotificacion('Libros cargados correctamente', 'success');
    } catch (error) {
        console.error('Error al obtener libros:', error);
    }
}

// Obtener libro por ID
async function obtenerLibroPorId(id) {
    try {
        const libro = await apiRequest(`/libros/${id}`);
        return libro;
    } catch (error) {
        console.error('Error al obtener libro:', error);
        return null;
    }
}

// Crear nuevo libro
async function crearLibro(libroData) {
    try {
        const nuevoLibro = await apiRequest('/libros', {
            method: 'POST',
            body: JSON.stringify(libroData)
        });
        mostrarNotificacion('Libro creado exitosamente', 'success');
        return nuevoLibro;
    } catch (error) {
        console.error('Error al crear libro:', error);
        return null;
    }
}

// Actualizar libro
async function actualizarLibro(id, datos) {
    try {
        const libroActualizado = await apiRequest(`/libros/${id}`, {
            method: 'PUT',
            body: JSON.stringify(datos)
        });
        mostrarNotificacion('Libro actualizado exitosamente', 'success');
        return libroActualizado;
    } catch (error) {
        console.error('Error al actualizar libro:', error);
        return null;
    }
}

// Eliminar libro
async function eliminarLibro(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este libro?')) {
        return false;
    }
    
    try {
        await apiRequest(`/libros/${id}`, {
            method: 'DELETE'
        });
        mostrarNotificacion('Libro eliminado exitosamente', 'success');
        return true;
    } catch (error) {
        console.error('Error al eliminar libro:', error);
        return false;
    }
}

// Buscar libros
async function buscarLibros() {
    const titulo = $('#searchTitulo').val().trim();
    const autor = $('#searchAutor').val().trim();
    const categoria = $('#searchCategoria').val().trim();
    const estado = $('#searchEstado').val();
    const exclusivo = $('#exclusivo').is(':checked');

    // Si no hay parámetros de búsqueda, obtener todos los libros
    if (!titulo && !autor && !categoria && !estado) {
        obtenerTodosLosLibros();
        return;
    }

    try {
        const params = new URLSearchParams();
        if (titulo) params.append('titulo', titulo);
        if (autor) params.append('autor', autor);
        if (categoria) params.append('categoria', categoria);
        if (estado) params.append('estado', estado);
        if (exclusivo) params.append('exclusivo', 'true');

        const libros = await apiRequest(`/libros/buscar?${params.toString()}`);
        
        mostrarLibros(libros);
        mostrarNotificacion(`Se encontraron ${libros.length} libro(s)`, 'info');

    } catch (error) {
        // Si es un error 404, tratamos como "no se encontraron libros"
        if (error?.response?.status === 404) {
            mostrarLibros([]); // Mostrar lista vacía
            mostrarNotificacion('No se encontraron libros.');
            return;
        }

        // Otro error: lo mostramos en consola
        console.error('Error al buscar libros:', error);
        mostrarNotificacion('Ocurrió un error al buscar libros.', 'error');
    }
}

// Mostrar libros en el DOM
function mostrarLibros(libros) {
    const $container = $('#librosContainer');
    
    if (!libros || libros.length === 0) {
        $container.html('<div class="no-books">No se encontraron libros</div>');
        return;
    }
    
    const librosHtml = libros.map(libro => `
        <div class="book-card">
            <div class="book-header">
                <h3>${libro.titulo}</h3>
                <span class="status ${libro.estado.toLowerCase()}">${libro.estado}</span>
            </div>
            <div class="book-info">
                <p><strong>Autor:</strong> ${libro.autor}</p>
                <p><strong>ISBN:</strong> ${libro.isbn}</p>
                <p><strong>Categoría:</strong> ${libro.categoria}</p>
                <p><strong>ID:</strong> ${libro.id}</p>
            </div>
            <div class="book-actions">
                <button onclick="abrirModalEdicion(${libro.id})" class="btn btn-primary btn-sm">Editar</button>
                <button onclick="eliminarYRecargar(${libro.id})" class="btn btn-danger btn-sm">Eliminar</button>
            </div>
        </div>
    `).join('');
    
    $container.html(librosHtml);
}

// Abrir modal de edición
async function abrirModalEdicion(id) {
    const libro = await obtenerLibroPorId(id);
    if (!libro) return;
    
    $('#editarId').val(libro.id);
    $('#editarTitulo').val(libro.titulo);
    $('#editarAutor').val(libro.autor);
    $('#editarIsbn').val(libro.isbn);
    $('#editarCategoria').val(libro.categoria);
    $('#editarEstado').val(libro.estado);
    
    $('#modalEditar').show();
}

// Cerrar modal
function cerrarModal() {
    $('#modalEditar').hide();
}

// Eliminar libro y recargar lista
async function eliminarYRecargar(id) {
    const eliminado = await eliminarLibro(id);
    if (eliminado) {
        obtenerTodosLosLibros();
    }
}

// Document ready
$(document).ready(function() {
    // Cargar libros al iniciar
    obtenerTodosLosLibros();
    
    // Form para agregar libro
    $('#formAgregar').on('submit', async function(e) {
        e.preventDefault();
        
        const nuevoLibro = {
            id: parseInt($('#nuevoId').val()),
            titulo: $('#nuevoTitulo').val(),
            autor: $('#nuevoAutor').val(),
            isbn: $('#nuevoIsbn').val(),
            categoria: $('#nuevaCategoria').val(),
            estado: $('#nuevoEstado').val()
        };
        
        const creado = await crearLibro(nuevoLibro);
        if (creado) {
            this.reset();
            obtenerTodosLosLibros();
        }
    });
    
    // Form para editar libro
    $('#formEditar').on('submit', async function(e) {
        e.preventDefault();
        
        const id = $('#editarId').val();
        const datosActualizados = {
            titulo: $('#editarTitulo').val(),
            autor: $('#editarAutor').val(),
            isbn: $('#editarIsbn').val(),
            categoria: $('#editarCategoria').val(),
            estado: $('#editarEstado').val()
        };
        
        const actualizado = await actualizarLibro(id, datosActualizados);
        if (actualizado) {
            cerrarModal();
            obtenerTodosLosLibros();
        }
    });
    
    // Buscar con Enter en los campos de búsqueda
    $('#searchTitulo, #searchAutor, #searchCategoria').on('keypress', function(e) {
        if (e.which === 13) { // Enter key
            buscarLibros();
        }
    });
    
    // Cerrar modal al hacer clic fuera de él
    $(window).on('click', function(e) {
        if (e.target.id === 'modalEditar') {
            cerrarModal();
        }
    });
    
    // Cerrar modal con botón X
    $('.close').on('click', cerrarModal);
});