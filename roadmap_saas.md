# 🚀 Roadmap SaaS - Contendo Gestiones
**Funcionalidades Pendientes para Producto Completo**

---

## 📊 **1. Sistema de Exportación Universal**
> Exportar datos a PDF, HTML, CSV/Excel para todos los módulos principales

### Módulos a Exportar
- [x] **Fichajes**
  - [x] Exportar fichajes por empleado (rango de fechas)
  - [x] Exportar fichajes por cliente
  - [x] Exportar fichajes sospechosos/rechazados
  - [x] Formatos: PDF, CSV, Excel, HTML
  
- [x] **Jornadas**
  - [x] Exportar jornadas por empleado
  - [x] Exportar resumen mensual de jornadas
  - [x] Incluir incidencias y descansos
  - [x] Formatos: PDF, CSV, Excel
  
- [x] **Partes Diarios**
  - [x] Exportar partes diarios individuales
  - [x] Exportar partes por rango de fechas
  - [x] Exportar resumen semanal/mensual
  - [x] Formatos: PDF, HTML, CSV
  
- [x] **Trabajos**
  - [x] Exportar trabajos por cliente
  - [x] Exportar trabajos por empleado
  - [ ] Exportar trabajos por proyecto
  - [x] Formatos: PDF, CSV, Excel
  
- [ ] **Facturación**
  - [ ] Exportar facturas (PDF fiscal)
  - [x] Exportar cobros pendientes
  - [x] Exportar histórico de pagos
  - [x] Formatos: PDF, CSV, Excel
  
- [ ] **Nóminas** (futuro)
  - [ ] Exportar nóminas mensuales
  - [ ] Exportar resumen anual
  - [ ] Formato: PDF

### Infraestructura Técnica
- [x] Librería de generación PDF (puppeteer/pdfkit)
- [x] Librería de generación Excel (exceljs)
- [x] Templates HTML reutilizables
- [x] Sistema de cola para exportaciones pesadas
- [x] Almacenamiento temporal de archivos generados

---

## 🔍 **2. Módulo de Auditoría**
> Trazabilidad completa de acciones administrativas y eventos del sistema

### Funcionalidades Core
- [x] **Log de Acciones Administrativas**
  - [x] Registro de validaciones de fichajes
  - [x] Registro de rechazos (fraude)
  - [x] Registro de cierres manuales de jornada
  - [x] Registro de modificaciones de empleados
  - [x] Registro de cambios en configuración
  
- [x] **Vista de Auditoría (Admin)**
  - [x] Tabla de logs con filtros
  - [x] Búsqueda por empleado, fecha, tipo de acción
  - [x] Detalle expandible de cada acción
  - [x] Exportación de logs
  
- [x] **Fichajes Rechazados**
  - [x] Vista dedicada para fichajes marcados como fraude
  - [x] Estadísticas de rechazos por empleado
  - [x] Histórico de fichajes rechazados
  - [x] Acciones sobre rechazados (eliminar, restaurar)

### Tabla de Base de Datos
- [x] Crear tabla `audit_log_180`
  - Campos: id, empresa_id, user_id, empleado_id (nullable), accion, entidad_tipo, entidad_id, datos_anteriores (JSON), datos_nuevos (JSON), ip, user_agent, timestamp

---

## ⚙️ **3. Gestión Avanzada de Fichajes Sospechosos**
> Mejorar el flujo de validación y rechazo de fichajes

### Acciones al Rechazar (Fraude)
- [x] **Opciones Configurables**
  - [x] Eliminar fichaje completamente
  - [x] Mantener como rechazado (actual)
  - [x] Recalcular jornada automáticamente
  - [x] Notificar al empleado por email
  - [x] Registrar en auditoría
  
- [x] **Flujo de Rechazo Mejorado**
  - [x] Modal de confirmación con opciones
  - [x] Campo obligatorio de motivo de rechazo
  - [x] Previsualización de impacto (horas afectadas)
  - [x] Confirmación de recálculo de jornada
  
- [ ] **Estadísticas de Fraude**
  - [ ] Dashboard de fichajes sospechosos
  - [ ] Tasa de fraude por empleado
  - [ ] Patrones de sospecha más comunes
  - [ ] Alertas automáticas

---

## 📈 **4. Informes y Analytics**
> Dashboards y reportes para toma de decisiones

### Informes Básicos
- [ ] **Informe de Productividad**
  - [ ] Horas trabajadas por empleado (mensual/anual)
  - [ ] Comparativa entre empleados
  - [ ] Gráficos de tendencias
  
- [ ] **Informe de Clientes**
  - [ ] Horas dedicadas por cliente
  - [x] Rentabilidad por cliente
  - [ ] Trabajos pendientes
  
- [ ] **Informe de Ausencias**
  - [ ] Días de vacaciones consumidos
  - [ ] Bajas médicas
  - [ ] Permisos

### Dashboards
- [x] Dashboard principal (resumen ejecutivo)
- [x] Dashboard de fichajes en tiempo real (Mapa en Sospechosos)
- [ ] Dashboard de facturación
- [x] Gráficos interactivos (Chart.js / Recharts)

---

## 💰 **5. Módulo de Facturación Completo**
> Integración total con el sistema de control horario

### Funcionalidades Pendientes
- [ ] **Generación de Facturas**
  - [ ] Crear factura desde partes diarios
  - [ ] Crear factura desde trabajos registrados
  - [ ] Plantillas de factura personalizables
  - [ ] Numeración automática
  - [ ] Cálculo de IVA/IRPF
  
- [ ] **Gestión de Cobros**
  - [ ] Registro de pagos recibidos
  - [ ] Seguimiento de facturas pendientes
  - [ ] Recordatorios automáticos
  - [ ] Conciliación bancaria (futuro)
  
- [ ] **Compras y Gastos**
  - [ ] Registro de compras
  - [ ] Asociación a proyectos/clientes
  - [ ] Cálculo de márgenes

---

## 🔔 **6. Sistema de Notificaciones**
> Comunicación automática con empleados y administradores

### Tipos de Notificaciones
- [ ] **Email**
  - [ ] Fichaje rechazado
  - [ ] Jornada cerrada manualmente
  - [ ] Ausencia aprobada/rechazada
  - [ ] Recordatorio de fichaje
  
- [ ] **In-App (futuro)**
  - [ ] Notificaciones en tiempo real
  - [ ] Centro de notificaciones
  - [ ] Badges de notificaciones pendientes

---

## 🔐 **7. Seguridad y Compliance**
> Cumplimiento legal y protección de datos

### Funcionalidades
- [ ] **RGPD**
  - [ ] Exportación de datos personales
  - [ ] Derecho al olvido (anonimización)
  - [ ] Consentimientos registrados
  
- [ ] **Backup y Recuperación**
  - [ ] Backups automáticos diarios
  - [ ] Restauración de datos
  - [ ] Versionado de datos críticos
  
- [ ] **Autenticación Avanzada**
  - [ ] 2FA (Two-Factor Authentication)
  - [ ] SSO (Single Sign-On) - futuro
  - [ ] Logs de inicio de sesión

---

## 📱 **8. Mejoras de UX/UI**
> Experiencia de usuario optimizada

### Mejoras Pendientes
- [ ] **Responsive Design**
  - [ ] Optimización móvil completa
  - [x] PWA (Progressive Web App)
  
- [ ] **Accesibilidad**
  - [ ] Soporte de teclado completo
  - [ ] Lectores de pantalla
  - [ ] Alto contraste
  
- [ ] **Onboarding**
  - [ ] Tour guiado para nuevos usuarios
  - [ ] Tooltips contextuales
  - [ ] Documentación integrada

---

## 🛠️ **9. Configuración Avanzada**
> Personalización del sistema por empresa

### Opciones de Configuración
- [ ] **Políticas de Fichaje**
  - [ ] Tolerancia de retraso configurable
  - [ ] Geolocalización obligatoria/opcional
  - [ ] Radio de geocerca personalizable
  
- [ ] **Plantillas Personalizables**
  - [ ] Plantillas de email
  - [ ] Plantillas de informes
  - [ ] Plantillas de facturas
  
- [ ] **Integraciones** (futuro)
  - [ ] API REST pública
  - [ ] Webhooks
  - [ ] Zapier/Make

---

## 📊 **10. Módulo de Nóminas** (futuro)
> Cálculo y gestión de nóminas

### Funcionalidades
- [ ] Cálculo automático de nóminas
- [ ] Integración con Seguridad Social
- [ ] Generación de PDF de nómina
- [ ] Histórico de nóminas

---

## 🎯 **Priorización Sugerida**

### **Fase 1 - Crítico** (1-2 meses)
1. Sistema de Exportación (Fichajes, Jornadas, Partes)
2. Módulo de Auditoría básico
3. Gestión mejorada de Fichajes Rechazados

### **Fase 2 - Importante** (2-3 meses)
4. Informes y Analytics básicos
5. Sistema de Notificaciones (Email)
6. Facturación completa

### **Fase 3 - Mejoras** (3-6 meses)
7. Seguridad y Compliance (RGPD, Backups)
8. Mejoras de UX/UI
9. Configuración Avanzada

### **Fase 4 - Futuro** (6+ meses)
10. Módulo de Nóminas
11. Integraciones (API, Webhooks)
12. PWA y App Móvil Nativa

---

## 📝 **Notas de Implementación**

- Cada funcionalidad marcada con `[ ]` se irá completando con `[x]` conforme se implemente
- Priorizar funcionalidades según feedback de usuarios reales
- Mantener este documento actualizado como fuente de verdad del roadmap
- Revisar y ajustar prioridades trimestralmente

---

**Última actualización:** 2026-01-28
**Estado:** Documento inicial creado
