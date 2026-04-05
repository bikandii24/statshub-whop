# Content Hub - Panel de Control (CM Dashboard)

Este proyecto es un panel de gestión de contenido centralizado diseñado para creadores y gestores de redes sociales. Implementado con Next.js, Tailwind CSS y shadcn/ui.

## Stack Tecnológico

- **Framework**: Next.js 15+ (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS v4 con variables OKLCH
- **Componentes**: shadcn/ui (Radix UI)
- **Iconos**: Lucide React
- **Animaciones**: Tailwind Animate + Framer Motion
- **Tema**: Dark Mode por defecto (Next Themes)
- **Idioma**: Castellano (Español)

## Estructura de Carpetas

- `src/app/`: Rutas y páginas de la aplicación.
  - `(sections)/`: Segmentos de ruta para el Gestor TikTok, Analítica, etc.
  - `layout.tsx`: Layout principal con Sidebar y Providers.
  - `page.tsx`: Dashboard / Home.
- `src/components/`: Componentes compartidos.
  - `ui/`: Componentes base de shadcn.
  - `app-sidebar.tsx`: Navegación lateral principal.
  - `theme-provider.tsx`: Gestor de temas (oscuro/claro).
- `src/lib/`: Utilidades y configuraciones.

## Convenciones de Componentes

1. **Estética Premium**: Uso intensivo de glassmorphism (`glass`, `glass-dark`), gradientes (`gradient-text`) y micro-animaciones.
2. **Atomicidad**: Mantener los componentes de UI en `src/components/ui` puros y exportar componentes de negocio en `src/components`.
3. **Responsive**: Todos los contenedores deben usar `grid` o `flex` adaptables (mobile-first).
4. **Dark Theme**: Diseñar pensando en el modo oscuro. Evitar fondos blancos puros.

## Decisiones Importantes

- **Bikan Hub Branding**: Toda la interfaz está personalizada para **Bikan**, con un diseño enfocado en la exclusividad y la legibilidad.
- **Deep Space Theme**: Implementado utilizando variables `oklch` en `globals.css` para lograr negros con profundidad y gradientes sutiles.
- **Glassmorphism & Glow**: Utilidades `.glass` y `.glow-card` para efectos de cristal interactivo y resplandores suaves que mejoran la jerarquía visual.
- **Tailwind v4**: Se optó por la última versión de Tailwind para aprovechar el motor Lightning CSS y la integración nativa con variables CSS.
- **Idioma**: Toda la interfaz y navegación se ha configurado en castellano a petición del usuario.

## Comandos Útiles

- `npm run dev`: Iniciar servidor de desarrollo.
- `npm run build`: Compilar para producción.
- `npx shadcn@latest add [component]`: Añadir nuevos componentes de UI.
