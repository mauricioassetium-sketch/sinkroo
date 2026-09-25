import { useState } from 'react';
import { Card, Badge, Button, Dinero, NotaMoneda } from '../components/ui';
import { ViewHead, BarRow, Ring } from '../components/viz';
import { I_Globe, I_Trend, I_Star, I_Eye, I_Zap, I_Check, I_ArrowRight, I_Plus, I_Users } from '../components/icons';
import { COMPETIDORES, ANGULOS, TENDENCIAS } from '../data/demo';
import { useDetalle } from '../components/Detalle';
import type { Vista } from '../components/Layout';

/** El día en que vuelve un hallazgo silenciado 7 días: se calcula, no se escribe a mano. */
const enUnaSemana = () =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('es-CO', { day: 'numeric', month: 'long' });

const OFERTA = [
  { k: 'Precio', usted: '$34', ellos: '$29 el más bajo', gana: false, nota: 'Va 17% arriba. Se compensa con envío y garantía.' },
  { k: 'Envío gratis', usted: 'desde $15.000', ellos: 'desde $20.000', gana: true, nota: 'Llega al envío gratis con menos compra que ellos.' },
  { k: 'Garantía', usted: '30 días', ellos: 'ninguno la ofrece', gana: true, nota: 'No le cuesta nada y ninguno de los 5 la tiene.' },
  { k: 'Atención por WhatsApp', usted: 'responde en 4 s', ellos: 'entre 6 y 24 h', gana: true, nota: 'La mitad de las consultas se cierran el mismo día.' },
  { k: 'Recompra automática', usted: 'a los 30 días', ellos: 'ninguno la tiene', gana: true, nota: 'Un cliente que vuelve cuesta $0 de publicidad.' },
  { k: 'Reseñas', usted: '128', ellos: '940 el líder', gana: false, nota: 'Su punto débil: es la objeción que marcó el juez más duro.' },
  { k: 'Retiro en el día', usted: 'no ofrece', ellos: 'sí, 2 de 5', gana: false, nota: 'Cuesta casi nada si despacha desde su local.' },
];

export function ViewMercado({ setToast, setVista }: { setToast: (t: string) => void; setVista?: (v: Vista) => void }) {
  const detalle = useDetalle();
  const maxAnuncios = Math.max(...COMPETIDORES.map(c => c.anuncios));
  const maxLeads = Math.max(...COMPETIDORES.map(c => c.leads));
  // Lo que el motor quedó haciendo: se ve en la pantalla, no en un aviso que se va solo.
  const [escribiendo, setEscribiendo] = useState<{ n: number; de: string } | null>(null);
  // El borrador de campaña creado desde aquí: queda a la vista y se puede abrir en Campañas.
  const [borradorCreado, setBorradorCreado] = useState(false);
  // Silenciar el hallazgo es reversible: vuelve a los 7 días o cuando lo destildes.
  const [silenciado, setSilenciado] = useState(false);
  const oro = ANGULOS[0];

  // La misma vista, dos pieles: un creador no ve el mercado de una empresa (competidores, anuncios,
  // precios propios), ve su nicho. Es la entrada «mercado» del Centro de Mando con el idioma de la
  // piel; todos los hooks de arriba ya se llamaron, así que el orden no cambia entre una piel y otra.

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Globe size={19} />}
        titulo="Mercado"
        sub="Qué está haciendo su competencia y por dónde conviene ir. Datos de la biblioteca pública de anuncios de Meta."
        nums={[
          { v: '47', l: 'anuncios analizados hoy' },
          { v: String(COMPETIDORES.length), l: 'competidores vigilados' },
          { v: '+32%', l: 'demanda de su producto', c: 'var(--green)' },
          { v: ANGULOS[0].nombre, l: `el ángulo que gana (${ANGULOS[0].pct}%)`, c: 'var(--purple3)' },
        ]}
      />

      {/* ============ EL HALLAZGO Y LA COMPETENCIA ============ */}
      <div className="duo">
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Zap size={14} style={{ color: 'var(--purple3)' }} /> Lo que encontró Lux hoy</span>}
          action={<Badge tone="purple">hace 12 min</Badge>}
        >
          <div className="alarm oportunidad">
            <div className="alarm-head">
              <span className="alarm-sev oportunidad">MOVIMIENTO DETECTADO</span>
            </div>
            <div className="alarm-title" style={{ minWidth: 0 }}>Su competidor más cercano bajó precios y se fue a video</div>
            <div className="alarm-money">
              <span className="ico" style={{ color: 'var(--purple3)' }}><I_Trend size={14} /></span>
              <span><b style={{ color: 'var(--purple3)' }}>Por qué importa: </b>Tienda Norte pasó de 6 a 14 anuncios activos en 30 días
                y bajó de $34 a $29. Si le sigue en precio, le saca el tráfico frío que hoy le cuesta $2,10 el clic.</span>
            </div>
            <div className="alarm-sug">
              <b>Qué sugiere: </b>no bajar el precio — diferenciar con el ángulo "ingredientes limpios" y con prueba social,
              que es donde el panel dice que está débil.
            </div>
            <div className="alarm-acts">
              {escribiendo
                ? <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--purple3)', fontWeight: 700 }}>
                    <I_Zap size={13} /> Nia está escribiendo {escribiendo.n} variantes del ángulo «{escribiendo.de}»: aparecen en la galería de Campañas.
                  </div>
                : <Button className="btn-sm" title="Le muestra las 6 variantes que va a escribir, con el ángulo y lo que cuestan. Reversible: no se escribe nada hasta que lo confirme."
                    onClick={() => detalle({
                      titulo: 'Nia escribe 6 variantes del ángulo «ingredientes limpios»',
                      sub: 'Es el ángulo que gana en su rubro y el que le diferencia sin bajar el precio. Nada se escribe hasta que lo confirme.',
                      bloques: [
                        { tipo: 'datos', filas: [
                          { k: 'Variantes que escribe', v: '6', s: 'el mismo mensaje, seis maneras distintas de empezar' },
                          { k: 'Ángulo que gana en su rubro', v: `${oro.nombre} · ${oro.pct}%`, s: `${oro.lectura.split('.')[0]}.` },
                          { k: 'Contra qué compite', v: 'Tienda Norte', s: 'pasó de 6 a 14 anuncios y bajó de $34 a $29' },
                          { k: 'Dónde se prueban', v: '5 jueces + 500 del público', s: 'en MiroFish, antes de que gaste un peso' },
                          { k: 'Lo que cuesta', v: '96 créditos', s: '6 variantes × 16 créditos' },
                          { k: 'Dónde las ves', v: 'Campañas → La galería', s: 'con el puntaje de cada una' },
                        ] },
                        { tipo: 'aviso', tono: 'amber', texto: 'Su precio no se toca: si Tienda Norte vuelve a bajar, bajar también le deja sin margen. La diferencia se juega en el ángulo.' },
                        { tipo: 'texto', texto: `Ejemplo de cómo empieza una de las 6: ${oro.ej}` },
                      ],
                      fuente: 'Sale del movimiento detectado hoy: 47 anuncios leídos, 3 cambios de precio y 2 ángulos nuevos.',
                      acciones: [
                        { label: 'Que escriba las 6', variante: 'primary', onClick: () => { setEscribiendo({ n: 6, de: 'ingredientes limpios' }); setToast('Nia está escribiendo 6 variantes del ángulo «ingredientes limpios»'); } },
                        { label: 'Dejarlo para después', onClick: () => setToast('Nada escrito: el hallazgo queda en Mercado') },
                      ],
                    })}>
                    <I_Plus size={13} /> Que Nia ataque por ahí
                  </Button>}
              <Button variant="ghost" className="btn-sm" title="Abre el informe de los 47 anuncios que leyó Lux, con el cambio de cada competidor"
                onClick={() => detalle({
                  titulo: 'Lo que leyó Lux hoy',
                  sub: 'Un anuncio público de su competencia dice más que cualquier estudio: esto está corriendo ahora y se puede copiar o evitar.',
                  bloques: [
                    { tipo: 'datos', filas: [
                      { k: 'Anuncios activos leídos', v: '47', s: 'biblioteca pública de anuncios de Meta · hoy 06:00' },
                      { k: 'Competidores vigilados', v: String(COMPETIDORES.length), s: 'los 5 de su zona' },
                      { k: 'Cambios de precio esta semana', v: '3', tono: 'amber', s: 'contra el precio de la semana pasada' },
                      { k: 'Ángulos nuevos', v: '2', s: 'no estaban hace 30 días' },
                      { k: 'Su costo del clic hoy', v: '$2,10', s: 'si le siguen bajando el precio: +$340 por semana' },
                    ] },
                    { tipo: 'filas', items: COMPETIDORES.map(c => ({
                      t: c.nombre + (c.propio ? ' (usted)' : ''),
                      s: `${c.anuncios} anuncios activos · ${c.leads} contactos por mes estimados · precio ${c.precio}`,
                      etiqueta: c.gasto === 'alto' ? 'gasto alto' : c.gasto === 'medio' ? 'gasto medio' : 'gasto bajo',
                      tono: c.gasto === 'alto' ? 'red' : c.gasto === 'medio' ? 'amber' : 'muted',
                    })) },
                    { tipo: 'texto', texto: `El ángulo que más se usa en su rubro es «${oro.nombre}» (${oro.pct}% de los anuncios). ${oro.lectura}` },
                  ],
                  fuente: 'Biblioteca pública de anuncios de Meta, leída todos los días a las 06:00. No hay estimaciones: son anuncios reales que están corriendo.',
                })}>Ver el informe</Button>
            </div>
          </div>
          <div>
            <div className="bs" style={{ marginBottom: 9 }}>Qué leyó Lux para llegar a esto:</div>
            <div className="guards">
              <div className="guard"><I_Eye size={14} style={{ color: 'var(--purple3)', flexShrink: 0 }} /><span className="guard-lb">Anuncios activos de sus competidores<small>biblioteca pública de Meta · hoy 06:00</small></span><span className="guard-val">47</span></div>
              <div className="guard"><I_Trend size={14} style={{ color: 'var(--amber)', flexShrink: 0 }} /><span className="guard-lb">Cambios de precio esta semana<small>contra el precio de la semana pasada</small></span><span className="guard-val" style={{ color: 'var(--amber)' }}>3</span></div>
              <div className="guard"><I_Star size={14} style={{ color: 'var(--purple3)', flexShrink: 0 }} /><span className="guard-lb">Ángulos nuevos que aparecieron<small>no estaban hace 30 días</small></span><span className="guard-val">2</span></div>
            </div>
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Costo del clic hoy</span><span className="dato-v"><Dinero monto="$2,10" /></span></div>
            <div className="dato"><span className="dato-l">Si le siguen en precio</span><span className="dato-v" style={{ color: 'var(--amber)' }}><Dinero monto="+$340/sem" /></span></div>
          </div>
          <div className="acc-why">
            Lux lee la biblioteca pública de anuncios de sus competidores <b>todos los días</b>.
            No adivina: compara anuncios reales que están corriendo ahora.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> Quién está pautando</span>}
          action={<Badge tone="purple">{maxAnuncios} el que más</Badge>}
        >
          {COMPETIDORES.map(c => (
            <div key={c.nombre} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="row spread" style={{ marginBottom: 7 }}>
                <span className="row" style={{ gap: 8 }}>
                  <span className="bt">{c.nombre}</span>
                  {c.propio && <Badge tone="purple">usted</Badge>}
                </span>
                <span className="row" style={{ gap: 8 }}>
                  <Badge tone={c.gasto === 'alto' ? 'red' : c.gasto === 'medio' ? 'amber' : 'muted'}>gasto {c.gasto}</Badge>
                  <span className="tiny" style={{ fontWeight: 800 }}><Dinero monto={c.precio} /></span>
                </span>
              </div>
              <BarRow valor={c.anuncios} max={maxAnuncios} formato={String(c.anuncios)}
                color={c.propio ? 'var(--purple2)' : 'var(--border2)'} />
            </div>
          ))}
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Contactos por mes estimados</span><span className="dato-v">{maxLeads} el que más</span></div>
            <div className="dato"><span className="dato-l">Su posición</span><span className="dato-v" style={{ color: 'var(--purple3)' }}>3º de {COMPETIDORES.length}</span></div>
          </div>
          <div className="acc-why">
            La barra gris es cuántos anuncios tiene cada uno corriendo. <b>Más anuncios no es mejor</b>:
            es más gasto y más apuesta. Le dice quién está empujando fuerte.
          </div>
        </Card>
      </div>

      {/* ============ DEMANDA Y ÁNGULOS ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Trend size={14} style={{ color: 'var(--green)' }} /> Para dónde va la demanda</span>}
          action={<Badge tone="green">últimos 30 días</Badge>}
        >
          <div className="como-se-lee">
            <b>Cómo se lee:</b> cada anillo se llena hasta 100. El número de adentro es el índice de los
            últimos 30 días contra el máximo del rubro. <b style={{ color: 'var(--green)' }}>Verde</b> = sube,
            <b style={{ color: 'var(--amber)' }}> ámbar</b> = baja. Y abajo de cada uno, qué significa para usted.
          </div>
          <div className="anillos">
            {TENDENCIAS.map(t => (
              <div key={t.label} className="anillo">
                <Ring valor={Math.round(parseFloat(t.width))} max={100} label="índice" size={86}
                  color={t.up ? 'var(--green)' : 'var(--amber)'} />
                <div className="anillo-lb">{t.label}</div>
                <div className="anillo-pie">
                  <span className="badge badge-muted" style={{ fontSize: 9 }}>{t.tag}</span>
                  <span style={{ fontWeight: 900, fontSize: 12.5, color: t.up ? 'var(--green)' : 'var(--amber)' }}>{t.num}</span>
                </div>
                <div className="anillo-lectura">{t.lectura}</div>
              </div>
            ))}
          </div>
          <div className="acc-why">
            <b>Demanda del mercado, no su desempeño.</b> Si la demanda sube y sus ventas no, el problema
            no es el mercado: es su anuncio.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Star size={14} style={{ color: 'var(--purple3)' }} /> Qué ángulos están funcionando</span>}
          action={<Badge tone="purple">{ANGULOS.length} detectados</Badge>}
        >
          <div className="como-se-lee">
            <b>Cómo se lee:</b> el anillo se llena hasta el ángulo más usado. El número de adentro es el
            <b> % de los anuncios del rubro</b> que usan ese ángulo. No es su desempeño: es lo que hace el mercado.
          </div>
          <div className="anillos">
            {ANGULOS.map(a => (
              <div key={a.nombre} className="anillo">
                <Ring valor={a.pct} max={ANGULOS[0].pct} label="del mercado" size={86} color="var(--purple2)" />
                <div className="anillo-lb">{a.nombre}</div>
                <div className="bs" style={{ textAlign: 'center' }}>«{a.ej}»</div>
                <div className="anillo-lectura">{a.lectura}</div>
              </div>
            ))}
          </div>
          <div className="acc-why">
            De qué habla el mercado cuando vende lo que usted vende. <b>No es una opinión de Sinkroo</b>:
            es el reparto real de los 47 anuncios que están corriendo en su nicho.
          </div>
        </Card>
      </div>

      {/* ============ LA DECISIÓN DEL MAPA Y PRÓXIMOS PASOS ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Users size={14} style={{ color: 'var(--purple3)' }} /> Su oferta contra la de ellos</span>}
          action={<Badge tone="green">{OFERTA.filter(x => x.gana).length} de {OFERTA.length} a favor</Badge>}
        >
          {OFERTA.map(x => (
            <div key={x.k} style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="row" style={{ gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span className="bt">{x.k}</span>
                <span className="badge" style={{ fontSize: 9.5, background: x.gana ? 'rgba(34,197,94,.14)' : 'rgba(245,158,11,.14)', color: x.gana ? 'var(--green)' : 'var(--amber)' }}>
                  {x.gana ? 'gana' : 'pierde'}
                </span>
                <span className="tiny muted">usted <Dinero monto={x.usted} /> · ellos <Dinero monto={x.ellos} equivalente={false} /></span>
              </div>
              <div className="bs">{x.nota}</div>
            </div>
          ))}
          <div className="row" style={{ marginTop: 14, gap: 9, flexWrap: 'wrap' }}>
            <Button className="btn-sm" title="Le muestra los 3 anuncios que va a escribir con su ventaja (garantía, envío y respuesta rápida). Reversible: nada se escribe hasta que lo confirme."
              onClick={() => detalle({
                titulo: 'Nia escribe 3 anuncios donde gana',
                sub: 'No se pelea el precio: se dice lo que ellos no tienen. Estos son los tres que salen de su oferta.',
                bloques: [
                  { tipo: 'filas', items: [
                    { t: 'Garantía de 30 días', s: 'ninguno de los 5 la ofrece. Es la ventaja más grande y no cuesta nada.', etiqueta: '1º', tono: 'purple' },
                    { t: 'Envío gratis desde $15.000', s: 'ellos lo dan desde $20.000: llega con menos compra.', etiqueta: '2º', tono: 'purple' },
                    { t: 'Respuesta en WhatsApp en 4 segundos', s: 'ellos tardan entre 6 y 24 horas. La mitad de las consultas se cierran el mismo día.', etiqueta: '3º', tono: 'purple' },
                  ] },
                  { tipo: 'datos', filas: [
                    { k: 'Contra quién juega', v: 'Precio', s: 'es donde pierde: su diferencia se dice, el precio no se toca' },
                    { k: 'Dónde se prueban', v: 'MiroFish', s: '5 jueces + 500 del público antes de gastar' },
                    { k: 'Lo que cuesta', v: '48 créditos', s: '3 variantes × 16 créditos' },
                  ] },
                  { tipo: 'aviso', texto: 'La reseña es su punto débil (128 contra 940 del líder): ninguno de estos tres anuncios la promete, para no exponerlo a la objeción del juez más duro.' },
                ],
                fuente: 'Saldría de la comparación de oferta de arriba: 4 de 7 puntos a favor, 3 en contra.',
                acciones: [
                  { label: 'Que escriba los 3', variante: 'primary', onClick: () => { setEscribiendo({ n: 3, de: 'su ventaja' }); setToast('Nia está escribiendo 3 anuncios donde gana'); } },
                  { label: 'Dejarlo para después', onClick: () => setToast('Nada escrito: la comparación queda en Mercado') },
                ],
              })}><I_Plus size={13} /> Anunciar donde gana</Button>
            <Button variant="ghost" className="btn-sm" title="Le muestra cómo consigue reseñas cada competidor: es el único punto donde va atrás"
              onClick={() => detalle({
                titulo: 'Cómo consiguen reseñas ellos',
                sub: 'La reseña es el punto donde va atrás (128 contra 940 del líder) y lo que más sube la confianza del que nunca le compró.',
                bloques: [
                  { tipo: 'filas', items: [
                    { t: 'Tienda Norte', s: 'Pide la reseña por WhatsApp 3 días después del envío, con el pedido ya entregado y el producto en uso.', etiqueta: '940 reseñas', tono: 'red' },
                    { t: 'DermaMarket', s: 'Manda un cupón del 10% a cambio de la reseña, en el mismo correo de la entrega.', etiqueta: '620 reseñas', tono: 'amber' },
                    { t: 'Belleza & Co', s: 'Suma la foto del antes y después al pedir la reseña: consigue texto largo, que pesa más.', etiqueta: '410 reseñas', tono: 'amber' },
                    { t: 'Green Beauty', s: 'Casi no pide: tiene pocas piezas y poca prueba social.', etiqueta: '150 reseñas', tono: 'muted' },
                    { t: 'Su marca', s: 'No la pide automáticamente: las 128 llegaron solas.', etiqueta: '128 reseñas', tono: 'red' },
                  ] },
                  { tipo: 'pasos', items: [
                    'Pedirla 3 días después de la entrega, por WhatsApp, con el mensaje ya escrito.',
                    'Ofrecer algo a cambio: un cupón para la próxima compra alcanza.',
                    'Pedir foto o video: una reseña con imagen pesa más en la decisión.',
                  ] },
                  { tipo: 'aviso', tono: 'amber', texto: 'Se activa desde Conversaciones, donde vive todo lo que trabaja solo. Basta con pedirla una vez: queda funcionando para siempre.' },
                ],
                fuente: 'Conteo de reseñas públicas de los 5 competidores, revisado esta semana.',
                acciones: [
                  { label: 'Configurar el pedido automático', variante: 'primary', onClick: () => setToast('Se configura en Conversaciones: pedirla después de cada entrega') },
                  { label: 'Cerrar', onClick: () => {} },
                ],
              })}>Ver cómo lo hacen ellos <I_ArrowRight size={13} /></Button>
          </div>
          <div className="acc-why">
            Es la comparación que hace un cliente cuando duda, no un informe de mercado.
            <b> Donde gana se dice en el anuncio</b>; donde pierde, se compensa con lo que ya tiene.
          </div>
          <NotaMoneda />
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Check size={14} style={{ color: 'var(--green)' }} /> Qué hacer con esto</span>}
          action={<Badge tone="green">4 acciones</Badge>}
        >
          <div className="col-stack">
            <div className="guard">
              <I_Check size={15} style={{ color: 'var(--green)', flexShrink: 0 }} />
              <span className="guard-lb">Ataque por ingredientes limpios
                <small>Nia ya tiene 6 variantes con ese ángulo. El panel las puntúa antes de que gaste.</small>
              </span>
            </div>
            <div className="guard">
              <I_Check size={15} style={{ color: 'var(--green)', flexShrink: 0 }} />
              <span className="guard-lb">Sumar prueba social
                <small>Es la única objeción de los jueces sobre su pieza aprobada. Un testimonio con nombre la lleva de 83 a ~90.</small>
              </span>
            </div>
            <div className="guard">
              <I_Check size={15} style={{ color: 'var(--green)', flexShrink: 0 }} />
              <span className="guard-lb">No tocar el precio
                <small>Bajar $5 le cuesta margen y Tienda Norte puede bajar otra vez. La diferenciación aguanta, la guerra de precio no.</small>
              </span>
            </div>
            <div className="guard">
              <I_Eye size={15} style={{ color: 'var(--purple3)', flexShrink: 0 }} />
              <span className="guard-lb">Vigilar a Tienda Norte cada semana
                <small>Ya bajó precios una vez. Si lo vuelve a hacer, conviene que lo sepa antes que sus clientes.</small>
              </span>
            </div>
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Si hace las 4</span><span className="dato-v" style={{ color: 'var(--green)' }}><Dinero monto="+$520/sem" /></span></div>
            <div className="dato"><span className="dato-l">Costo</span><span className="dato-v"><Dinero monto={0} equivalente={false} /></span></div>
            <div className="dato"><span className="dato-l">Se nota en</span><span className="dato-v">7 días</span></div>
          </div>
          <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
            {borradorCreado ? (
              <>
                <div className="tiny" style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--green)', fontWeight: 700 }}>
                  <I_Check size={13} /> Borrador creado con el ángulo «ingredientes limpios»: está en Campañas, paso 1.
                </div>
                <Button variant="outline" className="btn-sm" title="Abra Campañas, donde quedó el borrador para revisarlo y enviarlo a MiroFish"
                  onClick={() => setVista && setVista('campanas')}><I_ArrowRight size={13} /> Verlo en Campañas</Button>
              </>
            ) : (
              <Button className="btn-sm" title="Le muestra el borrador que se va a crear antes de crearlo. Reversible: puede borrarlo desde Campañas."
                onClick={() => detalle({
                  titulo: 'El borrador que se crea con esto',
                  sub: 'Las 4 acciones juntas, en una campaña que el motor arma y el panel puntúa antes de que gaste.',
                  bloques: [
                    { tipo: 'datos', filas: [
                      { k: 'Objetivo', v: 'Ventas', s: 'se mide por costo por venta, no por clics' },
                      { k: 'Ángulo', v: 'Ingredientes limpios', s: 'el que gana en su rubro hoy' },
                      { k: 'Público', v: 'Los que le miraron y no compraron', s: 'más los que compraron una vez' },
                      { k: 'Dónde se publica', v: 'Instagram y Facebook', s: 'las dos cuentas ya conectadas' },
                      { k: 'Presupuesto sugerido', v: '$23 por día', s: 'lo que hoy rinde más en su cuenta' },
                      { k: 'Lo que se espera', v: '+$520 por semana', s: 'si se cumplen las 4 acciones' },
                    ] },
                    { tipo: 'pasos', items: [
                      'Nia escribe las piezas con el ángulo que gana.',
                      'Los 5 jueces y los 500 del público las puntúan.',
                      'Las 3 mejores salen a sus cuentas.',
                      'Se mide el costo por venta y se frena lo que no rinde.',
                    ] },
                    { tipo: 'aviso', texto: 'No gasta nada hasta que las piezas pasan el panel: si ninguna convence, no sale ninguna.' },
                  ],
                  fuente: 'Se arma con el hallazgo de hoy y con sus números de las últimas campañas.',
                  acciones: [
                    { label: 'Crear el borrador', variante: 'primary', onClick: () => { setBorradorCreado(true); setToast('Borrador creado: está en Campañas, paso 1'); } },
                    { label: 'Todavía no', onClick: () => setToast('Sin cambios') },
                  ],
                })}>
                <I_Plus size={13} /> Atacar con esto
              </Button>
            )}
            {silenciado ? (
              <Button variant="outline" className="btn-sm" title="Vuelve a mostrar el hallazgo ahora, sin esperar los 7 días"
                onClick={() => { setSilenciado(false); setToast('El hallazgo vuelve a estar a la vista'); }}>
                <I_Eye size={13} /> Volver a mostrarlo
              </Button>
            ) : (
              <Button variant="ghost" className="btn-sm" title="Deja de mostrar este hallazgo por 7 días. Reversible: lo puede volver a mostrar cuando quiera."
                onClick={() => { setSilenciado(true); setToast(`Hallazgo silenciado hasta el ${enUnaSemana()}`); }}>Silenciar</Button>
            )}
          </div>
          {silenciado && (
            <div className="tiny" style={{ marginTop: 9, color: 'var(--amber)', fontWeight: 700 }}>
              Silenciado 7 días: vuelve el {enUnaSemana()}. Mientras tanto no cuenta como pendiente.
            </div>
          )}
          <div className="acc-why">
            Cada recomendación sale de un dato de arriba. <b>Nada de esta pantalla es opinión</b>: o es un anuncio real de su competencia, o es una métrica suya.
          </div>
        </Card>
      </div>
    </div>
  );
}
