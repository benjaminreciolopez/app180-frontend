import Link from "next/link";
import { Shield, FileCheck, Clock, Lock, Eye, Server, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function CumplimientoLegalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <ArrowLeft className="w-4 h-4" /> Volver al Inicio
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Cumplimiento Legal</h1>
              <p className="text-slate-500 mt-1">Como CONTENDO protege tu negocio y cumple la ley</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8">
            <p className="text-slate-700 leading-relaxed">
              CONTENDO no es solo una herramienta de gestion. Es un sistema diseñado desde el primer dia para que tu negocio
              cumpla la normativa española <strong>sin que tengas que preocuparte</strong>. Cada dato que registras queda
              protegido automaticamente, sin que tu hagas nada especial. Aqui te explicamos como, en lenguaje normal.
            </p>
          </div>

          <p className="text-xs text-gray-400 mb-2">
            Ultima actualizacion: {new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* SECTION 1: FICHAJES */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Control Horario (Fichajes)</h2>
          </div>
          <p className="text-sm text-emerald-700 bg-emerald-50 inline-block px-3 py-1 rounded-full mb-6 font-medium">
            Real Decreto-ley 8/2019 · Art. 34.9 Estatuto de los Trabajadores
          </p>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg text-slate-800 mb-2">¿Que exige la ley?</h3>
              <p className="text-slate-600 leading-relaxed">
                Desde 2019, todas las empresas estan obligadas a registrar la hora de entrada y salida de cada trabajador,
                cada dia. Este registro debe ser <strong>fiable</strong>, <strong>inmodificable</strong> y debe conservarse
                durante <strong>4 años</strong>. Ademas, debe estar disponible para los trabajadores, los sindicatos y
                la Inspeccion de Trabajo en cualquier momento.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg text-slate-800 mb-2">¿Como lo cumple CONTENDO?</h3>
              <ul className="space-y-4">
                <Item title="Sellado digital automatico">
                  Cada vez que un empleado ficha (entrada, salida o pausa), el sistema genera automaticamente una
                  &quot;huella digital&quot; unica de ese registro. Es como un sello de lacre digital: si alguien
                  intentara cambiar la hora, la fecha o cualquier dato, el sello se romperia y se detectaria al instante.
                </Item>
                <Item title="Encadenamiento de registros">
                  Cada fichaje lleva incorporado el sello del fichaje anterior. Esto crea una cadena donde cada
                  registro depende del anterior, como los eslabones de una cadena. Si alguien eliminara o modificara
                  un fichaje del pasado, toda la cadena posterior quedaria rota y el sistema lo detectaria automaticamente.
                  Es la misma tecnologia que utiliza Hacienda para las facturas electronicas.
                </Item>
                <Item title="Los fichajes no se pueden borrar ni editar">
                  Una vez registrado un fichaje, nadie puede eliminarlo ni cambiar su contenido. Ni el empleado,
                  ni el administrador, ni siquiera nosotros. Si hay un error, se solicita una correccion que crea
                  un <strong>nuevo registro</strong> vinculado al original, dejando constancia de quien lo pidio,
                  quien lo aprobo y por que motivo. El registro original permanece intacto para siempre.
                </Item>
                <Item title="Verificacion publica de documentos">
                  Cuando exportas los fichajes en PDF, el documento incluye un <strong>Codigo Seguro de Verificacion (CSV)</strong> y
                  un codigo QR. Cualquier persona (un inspector, un juez, un abogado laboralista) puede escanear ese QR
                  o introducir el codigo en nuestra web para confirmar que el documento es autentico y que no ha sido
                  manipulado. Sin necesidad de acceder a tu cuenta.
                </Item>
                <Item title="Deteccion inteligente de fichajes sospechosos">
                  El sistema analiza automaticamente cada fichaje buscando anomalias: ubicaciones inusuales,
                  fichajes muy rapidos, horarios fuera de lo normal o direcciones IP sospechosas. Estos fichajes
                  se marcan pero no se bloquean, para que el administrador los revise y decida.
                </Item>
                <Item title="Conservacion garantizada">
                  Todos los registros se almacenan durante un minimo de 4 años, cumpliendo el plazo legal.
                  Los datos estan protegidos en servidores europeos con cifrado y copias de seguridad automaticas.
                </Item>
              </ul>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
              <p className="text-sm text-emerald-800 leading-relaxed">
                <strong>En resumen:</strong> si un empleado te denuncia alegando horas no trabajadas, o si la Inspeccion
                de Trabajo te pide los registros, puedes exportar un PDF verificable que demuestra, de forma
                independiente y verificable por terceros, que los datos son autenticos y no han sido manipulados
                en ningun momento.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 2: VERIFACTU */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Facturacion Electronica (VeriFactu)</h2>
          </div>
          <p className="text-sm text-blue-700 bg-blue-50 inline-block px-3 py-1 rounded-full mb-6 font-medium">
            Ley 11/2021 Antifraude · RD 1007/2023 · Sociedades: enero 2027 · Autonomos: julio 2027
          </p>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg text-slate-800 mb-2">¿Que exige la ley?</h3>
              <p className="text-slate-600 leading-relaxed">
                La Ley Antifraude obliga a que todos los programas de facturacion garanticen la
                <strong> integridad, conservacion, trazabilidad e inalterabilidad</strong> de las facturas.
                Hacienda (AEAT) debe poder verificar cualquier factura en cualquier momento. Ningun programa
                puede permitir llevar una &quot;doble contabilidad&quot; o emitir facturas que luego se puedan
                borrar sin dejar rastro.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg text-slate-800 mb-2">¿Como lo cumple CONTENDO?</h3>
              <ul className="space-y-4">
                <Item title="Sellado digital de cada factura">
                  Al emitir una factura, el sistema calcula automaticamente una huella digital unica que resume
                  todos sus datos (numero, fecha, importe, NIF del emisor). Si alguien cambiara un solo centimo
                  o una sola letra, la huella ya no coincidiria y Hacienda lo detectaria.
                </Item>
                <Item title="Encadenamiento de facturas">
                  Igual que con los fichajes, cada factura lleva incorporada la huella de la factura anterior.
                  Esto hace imposible eliminar una factura intermedia sin que se note: la cadena se romperia.
                  No se puede &quot;hacer desaparecer&quot; una factura.
                </Item>
                <Item title="Doble firma digital">
                  CONTENDO soporta firma digital doble: la del contribuyente (tu certificado electronico)
                  y la del fabricante del software (nosotros). Esto aporta dos niveles de garantia sobre la
                  autenticidad de cada factura.
                </Item>
                <Item title="Codigo QR verificable">
                  Cada factura incluye un codigo QR que enlaza directamente con la AEAT. Tu cliente, o cualquier
                  tercero, puede escanear el QR para verificar que la factura es real y esta registrada.
                </Item>
                <Item title="Registro automatico ante Hacienda">
                  Las facturas se registran automaticamente ante la Agencia Tributaria. No tienes que hacer nada
                  manualmente: el sistema se encarga de enviar la informacion en el formato que exige la AEAT.
                </Item>
                <Item title="Imposibilidad de doble contabilidad">
                  El sistema no permite emitir facturas &quot;en B&quot; ni llevar una contabilidad paralela.
                  Todos los numeros de factura son secuenciales y encadenados. Cualquier salto o alteracion
                  en la secuencia se detecta automaticamente.
                </Item>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
              <p className="text-sm text-blue-800 leading-relaxed">
                <strong>En resumen:</strong> CONTENDO cumple con la Ley Antifraude antes de que sea obligatoria.
                Tus facturas quedan selladas, encadenadas y registradas ante Hacienda. No hay forma de manipularlas
                sin que se detecte. Cuando entre en vigor (enero 2027 para sociedades, julio 2027 para autonomos),
                tu negocio ya estara preparado.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 3: PROTECCION DE DATOS */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-violet-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Proteccion de Datos</h2>
          </div>
          <p className="text-sm text-violet-700 bg-violet-50 inline-block px-3 py-1 rounded-full mb-6 font-medium">
            RGPD (UE) 2016/679 · LOPDGDD 3/2018
          </p>

          <ul className="space-y-4">
            <Item title="Aislamiento total entre empresas">
              Los datos de cada empresa estan completamente separados. Es tecnicamente imposible que una empresa
              vea los datos de otra, ni siquiera por error. Cada consulta a la base de datos esta filtrada
              automaticamente por empresa.
            </Item>
            <Item title="Servidores en la Union Europea">
              Todos los datos se almacenan en centros de datos ubicados en la UE, cumpliendo con las exigencias
              del Reglamento General de Proteccion de Datos (RGPD).
            </Item>
            <Item title="Cifrado en transito y en reposo">
              Toda la comunicacion entre tu navegador y nuestros servidores esta cifrada (HTTPS/TLS).
              Los datos almacenados tambien estan cifrados en la base de datos.
            </Item>
            <Item title="Registro de auditoria">
              Todas las acciones importantes quedan registradas: quien hizo que, cuando y desde donde.
              Este registro es inmodificable y se conserva para cualquier auditoria o inspeccion.
            </Item>
          </ul>
        </div>

        {/* SECTION 4: DISPONIBILIDAD */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Server className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Disponibilidad y Copias de Seguridad</h2>
          </div>

          <ul className="space-y-4">
            <Item title="Acceso desde cualquier lugar">
              CONTENDO funciona en cualquier navegador, movil u ordenador. No necesitas instalar nada.
              Tus datos estan siempre disponibles, 24 horas, 7 dias a la semana.
            </Item>
            <Item title="Copias de seguridad automaticas">
              Los datos se respaldan automaticamente varias veces al dia. En caso de cualquier incidencia,
              se puede recuperar la informacion de forma inmediata.
            </Item>
            <Item title="Conservacion a largo plazo">
              Todos los registros (fichajes, facturas, contabilidad) se conservan durante el tiempo que exige
              la ley (4 años para fichajes, 6 años para documentos contables), sin que tengas que hacer nada.
            </Item>
          </ul>
        </div>

        {/* SECTION 5: TRANSPARENCIA */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 text-cyan-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Transparencia</h2>
          </div>

          <div className="space-y-4">
            <p className="text-slate-600 leading-relaxed">
              No hay vicios ocultos. Todo lo que aparece en esta pagina esta implementado y funcionando
              en la version actual de CONTENDO. No son promesas de futuro ni funcionalidades &quot;en desarrollo&quot;.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Cualquier persona puede verificar la autenticidad de un documento exportado desde CONTENDO
              mediante el Codigo Seguro de Verificacion (CSV) incluido en cada exportacion, sin necesidad
              de tener cuenta en la plataforma.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Si tienes cualquier duda sobre el cumplimiento normativo de CONTENDO, puedes contactarnos
              en <strong>info@contendo.es</strong>.
            </p>
          </div>
        </div>

        {/* NORMATIVA REFERENCE TABLE */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Normativa Aplicable</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 text-slate-600 font-semibold">Normativa</th>
                  <th className="text-left py-3 px-4 text-slate-600 font-semibold">Ambito</th>
                  <th className="text-left py-3 px-4 text-slate-600 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <NormRow
                  norma="RD-ley 8/2019"
                  ambito="Registro de jornada obligatorio"
                  estado="Cumplido"
                />
                <NormRow
                  norma="Ley 11/2021 (Antifraude)"
                  ambito="Integridad de software de facturacion"
                  estado="Cumplido"
                />
                <NormRow
                  norma="RD 1007/2023 (VeriFactu)"
                  ambito="Facturas verificables ante AEAT"
                  estado="Cumplido"
                />
                <NormRow
                  norma="RGPD (UE) 2016/679"
                  ambito="Proteccion de datos personales"
                  estado="Cumplido"
                />
                <NormRow
                  norma="LOPDGDD 3/2018"
                  ambito="Proteccion de datos (España)"
                  estado="Cumplido"
                />
                <NormRow
                  norma="Ley Fichaje Digital 2026"
                  ambito="Registro horario digital obligatorio"
                  estado="Preparado"
                />
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-400 py-8">
          <p>CONTENDO GESTIONES &mdash; Cumplimiento legal verificable, sin letra pequeña.</p>
        </div>
      </div>
    </div>
  );
}

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
      <div>
        <p className="font-medium text-slate-800">{title}</p>
        <p className="text-slate-600 text-sm leading-relaxed mt-1">{children}</p>
      </div>
    </li>
  );
}

function NormRow({ norma, ambito, estado }: { norma: string; ambito: string; estado: string }) {
  const color = estado === "Cumplido" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800";
  return (
    <tr>
      <td className="py-3 px-4 font-medium text-slate-800">{norma}</td>
      <td className="py-3 px-4 text-slate-600">{ambito}</td>
      <td className="py-3 px-4">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${color}`}>{estado}</span>
      </td>
    </tr>
  );
}
