export default function AvisoLegalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 md:p-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Aviso Legal</h1>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">1. Datos Identificativos</h2>
          <p className="text-slate-700 mb-4">
            En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y Comercio Electrónico:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-700">
            <li><strong>Titular:</strong> CONTENDO GESTIONES SL</li>
            <li><strong>NIF:</strong> B12345678</li>
            <li><strong>Domicilio:</strong> Calle Mayor, 123, 28013 Madrid</li>
            <li><strong>Email:</strong> info@contendo.es</li>
            <li><strong>Teléfono:</strong> +34 912 345 678</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">2. Objeto</h2>
          <p className="text-slate-700">
            El presente Aviso Legal regula el uso del sitio web <strong>contendo.es</strong> y la aplicación <strong>APP180</strong>.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">3. Condiciones de Uso</h2>
          <p className="text-slate-700 mb-4">
            El acceso y uso implica la aceptación expresa de todas las condiciones del presente Aviso Legal.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">4. Propiedad Intelectual</h2>
          <p className="text-slate-700">
            Todos los contenidos están protegidos por las leyes de propiedad intelectual e industrial.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-800 mb-4">5. Legislación Aplicable</h2>
          <p className="text-slate-700">
            Se rige por la legislación española. Juzgados y Tribunales de Madrid.
          </p>
        </section>

        <p className="text-sm text-slate-500 mt-12">
          Última actualización: {new Date().toLocaleDateString('es-ES')}
        </p>
      </div>
    </div>
  );
}
