# Portfolio de Iker Martín Gámez

Web personal estática: HTML, CSS y JavaScript sin dependencias ni paso de compilación.

## La idea

El hero tiene una **lupa de rayos X**: al pasar el cursor por encima, un círculo deja ver
"lo que hay debajo" de la web. Ahí aparece el mismo texto en contorno, los botones convertidos
en endpoints (`POST /api/contacto`) y un esquema del backend con peticiones viajando en
tiempo real entre servicios (API, reservas, pagos, base de datos, avisos…).

- Ratón: la lupa sigue al cursor y desaparece al salir.
- Móvil: la lupa se pasea sola hasta que tocas la cabecera.
- `prefers-reduced-motion`: la lupa se queda quieta y no hay animación.

## Estructura

```
index.html          Todo el contenido
css/styles.css      Estilos (los colores y fuentes están arriba, en :root)
js/main.js          La lupa y el esquema del backend (canvas)
assets/             Favicon, capturas de proyectos y tu foto
```

## Verlo en local

Hace falta un servidor local (no abras el archivo con doble clic):

```bash
npx serve .
# o
python3 -m http.server 8000
```

## Qué te falta rellenar

Busca los `[corchetes]` en `index.html` (el script `publicar.sh` sustituye `TU-USUARIO` por tu usuario de GitHub):

- [ ] Captura de AlFallo en `assets/alfallo.jpg` (sustituye su `div.project__media` por un `<img>`)
- [ ] Enlaces "Ver demo" de Casa Anaga y Fisio Teide cuando estén desplegados
- [ ] Tu foto en `.about__photo`
- [ ] Tu email (en el `mailto:` y en el texto del botón)
- [ ] Tus enlaces de LinkedIn y GitHub

Para cambiar los servicios del esquema del backend, edita `LAYOUTS` y `EDGES` en `js/main.js`.

## Publicarlo gratis

- **GitHub Pages**: sube el repo, entra en Settings > Pages y elige la rama `main`.
- **Netlify** o **Vercel**: importa el repo. No necesita build command.
- **Dominio propio**: cómpralo (por ejemplo, ikermartin.dev) y apúntalo desde la configuración de la plataforma.
