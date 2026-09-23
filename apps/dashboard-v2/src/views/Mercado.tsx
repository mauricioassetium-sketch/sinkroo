import { Card, Badge, Button } from '../components/ui';
import { ViewHead, BarRow } from '../components/viz';
import { I_Globe, I_Trend, I_Star, I_Eye, I_Zap, I_Check, I_ArrowRight, I_Plus, I_Users } from '../components/icons';
import { COMPETIDORES, ANGULOS, TENDENCIAS } from '../data/demo';

export function ViewMercado({ setToast }: { setToast: (t: string) => void }) {
  const maxAnuncios = Math.max(...COMPETIDORES.map(c => c.anuncios));
  const maxLeads = Math.max(...COMPETIDORES.map(c => c.leads));

  return (
    <div className="dash">
      <ViewHead
        icon={<I_Globe size={19} />}
        titulo="Mercado"
        sub="Qué está haciendo tu competencia y por dónde conviene ir. Datos de la biblioteca pública de anuncios de Meta."
        nums={[
          { v: '47', l: 'anuncios analizados hoy' },
          { v: String(COMPETIDORES.length), l: 'competidores vigilados' },
          { v: '+32%', l: 'demanda de tu producto', c: 'var(--green)' },
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
            <div className="alarm-title" style={{ minWidth: 0 }}>Tu competidor más cercano bajó precios y se fue a video</div>
            <div className="alarm-money">
              <span className="ico" style={{ color: 'var(--purple3)' }}><I_Trend size={14} /></span>
              <span><b style={{ color: 'var(--purple3)' }}>Por qué importa: </b>Tienda Norte pasó de 6 a 14 anuncios activos en 30 días
                y bajó de $34 a $29. Si te sigue en precio, te saca el tráfico frío que hoy te cuesta $2,10 el clic.</span>
            </div>
            <div className="alarm-sug">
              <b>Qué sugiere: </b>no bajar el precio — diferenciar con el ángulo "ingredientes limpios" y con prueba social,
              que es donde el panel dice que estás débil.
            </div>
            <div className="alarm-acts">
              <Button className="btn-sm" title="Nia escribe 6 variantes con el ángulo que gana, sin tocar tu precio"
                onClick={() => setToast('Nia prepara 6 variantes del ángulo limpio (demo)')}>
                <I_Plus size={13} /> Que Nia ataque por ahí
              </Button>
              <Button variant="ghost" className="btn-sm" title="Abre el informe completo con los 47 anuncios leídos"
                onClick={() => setToast('Informe completo (demo)')}>Ver el informe</Button>
            </div>
          </div>
          <div>
            <div className="bs" style={{ marginBottom: 9 }}>Qué leyó Lux para llegar a esto:</div>
            <div className="guards">
              <div className="guard"><I_Eye size={14} style={{ color: 'var(--purple3)', flexShrink: 0 }} /><span className="guard-lb">Anuncios activos de tus competidores<small>biblioteca pública de Meta · hoy 06:00</small></span><span className="guard-val">47</span></div>
              <div className="guard"><I_Trend size={14} style={{ color: 'var(--amber)', flexShrink: 0 }} /><span className="guard-lb">Cambios de precio esta semana<small>contra el precio de la semana pasada</small></span><span className="guard-val" style={{ color: 'var(--amber)' }}>3</span></div>
              <div className="guard"><I_Star size={14} style={{ color: 'var(--purple3)', flexShrink: 0 }} /><span className="guard-lb">Ángulos nuevos que aparecieron<small>no estaban hace 30 días</small></span><span className="guard-val">2</span></div>
            </div>
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Costo del clic hoy</span><span className="dato-v">$2,10</span></div>
            <div className="dato"><span className="dato-l">Si te siguen en precio</span><span className="dato-v" style={{ color: 'var(--amber)' }}>+$340/sem</span></div>
          </div>
          <div className="acc-why">
            Lux lee la biblioteca pública de anuncios de tus competidores <b>todos los días</b>.
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
                  {c.propio && <Badge tone="purple">vos</Badge>}
                </span>
                <span className="row" style={{ gap: 8 }}>
                  <Badge tone={c.gasto === 'alto' ? 'red' : c.gasto === 'medio' ? 'amber' : 'muted'}>gasto {c.gasto}</Badge>
                  <span className="tiny" style={{ fontWeight: 800 }}>${c.precio}</span>
                </span>
              </div>
              <BarRow valor={c.anuncios} max={maxAnuncios} formato={String(c.anuncios)}
                color={c.propio ? 'var(--purple2)' : 'var(--border2)'} />
            </div>
          ))}
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Leads/mes estimados</span><span className="dato-v">{maxLeads} el que más</span></div>
            <div className="dato"><span className="dato-l">Tu posición</span><span className="dato-v" style={{ color: 'var(--purple3)' }}>3º de {COMPETIDORES.length}</span></div>
          </div>
          <div className="acc-why">
            La barra gris es cuántos anuncios tiene cada uno corriendo. <b>Más anuncios no es mejor</b>:
            es más gasto y más apuesta. Te dice quién está empujando fuerte.
          </div>
        </Card>
      </div>

      {/* ============ DEMANDA Y ÁNGULOS ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Trend size={14} style={{ color: 'var(--green)' }} /> Para dónde va la demanda</span>}
          action={<Badge tone="green">últimos 30 días</Badge>}
        >
          {TENDENCIAS.map(t => (
            <div key={t.label} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="row spread" style={{ marginBottom: 7 }}>
                <span className="row" style={{ gap: 8 }}>
                  <span className="bt">{t.label}</span>
                  <Badge tone="muted">{t.tag}</Badge>
                </span>
                <span style={{ fontWeight: 900, fontSize: 15, color: t.up ? 'var(--green)' : 'var(--amber)' }}>{t.num}</span>
              </div>
              <BarRow valor={parseFloat(t.width)} max={100} formato={`${t.width}`}
                color={t.up ? 'var(--green)' : 'var(--amber)'} />
            </div>
          ))}
          <div className="acc-why">
            <b>Demanda del mercado, no tu desempeño.</b> Si la demanda sube y tus ventas no, el problema
            no es el mercado: es tu anuncio.
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Star size={14} style={{ color: 'var(--purple3)' }} /> Qué ángulos están funcionando</span>}
          action={<Badge tone="purple">{ANGULOS.length} detectados</Badge>}
        >
          {ANGULOS.map(a => (
            <div key={a.nombre} style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="row spread" style={{ marginBottom: 7 }}>
                <span className="bt">{a.nombre}</span>
                <span style={{ fontWeight: 900, fontSize: 15, color: 'var(--purple3)' }}>{a.pct}%</span>
              </div>
              <BarRow valor={a.pct} max={ANGULOS[0].pct} formato={`${a.pct}%`} color="var(--purple2)" />
              <div className="bs" style={{ marginTop: 6 }}>«{a.ej}»</div>
            </div>
          ))}
          <div className="acc-why">
            De qué habla el mercado cuando vende lo que vos vendés. <b>No es una opinión de Sinkroo</b>:
            es el reparto real de los 47 anuncios que están corriendo en tu nicho.
          </div>
        </Card>
      </div>

      {/* ============ LA DECISIÓN DEL MAPA Y PRÓXIMOS PASOS ============ */}
      <div className="duo" style={{ marginTop: 16 }}>
        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Eye size={14} style={{ color: 'var(--muted)' }} /> ¿Y el mapa?</span>}
          action={<Badge tone="muted">decisión de producto</Badge>}
        >
          <div className="strike-list">
            <div className="strike-item"><I_Eye size={14} /><span><b style={{ color: 'var(--txt)' }}>Era lo más vistoso y lo menos accionable.</b> Saber dónde están las tiendas de tu competencia no cambia ninguna decisión de campaña. Saber que bajaron 15% y se fueron a video, sí.</span></div>
            <div className="strike-item"><I_Zap size={14} /><span><b style={{ color: 'var(--txt)' }}>Costo cero contra costo mensual.</b> Google Maps exige cuenta de GCP con facturación activa; la biblioteca de anuncios de Meta es pública y gratis.</span></div>
            <div className="strike-item"><I_Star size={14} /><span><b style={{ color: 'var(--txt)' }}>Si algún día lo querés, entra como integración BYO.</b> No se descarta para siempre: se saca del camino crítico.</span></div>
          </div>
          <div className="datos-row" style={{ marginTop: 14, paddingTop: 13, borderTop: '1px solid var(--border)' }}>
            <div className="dato"><span className="dato-l">Costo de tenerlo</span><span className="dato-v">$0 hoy</span></div>
            <div className="dato"><span className="dato-l">Decisión que cambia</span><span className="dato-v" style={{ color: 'var(--muted)' }}>ninguna</span></div>
            <div className="dato"><span className="dato-l">Se puede recuperar</span><span className="dato-v" style={{ color: 'var(--green)' }}>sí, cuando quieras</span></div>
          </div>
          <div className="bs" style={{ marginTop: 12 }}>
            Si lo querés, se conecta <b>con tu propia cuenta de Google</b>: nos das la clave, no la compartimos
            con nadie y podés revocarla desde tu panel de Google cuando quieras.
          </div>
          <div className="row" style={{ marginTop: 14, gap: 9, flexWrap: 'wrap' }}>
            <Button variant="outline" className="btn-sm" title="Conectás tu propia API de Google y el mapa vuelve"
              onClick={() => setToast('Conectar Google Maps como integración BYO (demo)')}><I_Globe size={13} /> Conectar el mío</Button>
            <Button variant="ghost" className="btn-sm" title="Muestra la tendencia de 90 días en vez de 30"
              onClick={() => setToast('Tendencia de 90 días (demo)')}>Ver 90 días <I_ArrowRight size={13} /></Button>
          </div>
        </Card>

        <Card
          title={<span className="row" style={{ gap: 8 }}><I_Check size={14} style={{ color: 'var(--green)' }} /> Qué hacer con esto</span>}
          action={<Badge tone="green">3 acciones</Badge>}
        >
          <div className="col-stack">
            <div className="guard">
              <I_Check size={15} style={{ color: 'var(--green)', flexShrink: 0 }} />
              <span className="guard-lb">Ataque por ingredientes limpios
                <small>Nia ya tiene 6 variantes con ese ángulo. El panel las puntúa antes de que gastes.</small>
              </span>
            </div>
            <div className="guard">
              <I_Check size={15} style={{ color: 'var(--green)', flexShrink: 0 }} />
              <span className="guard-lb">Sumar prueba social
                <small>Es la única objeción del panel sobre tu pieza aprobada. Un testimonio con nombre la lleva de 84 a ~90.</small>
              </span>
            </div>
            <div className="guard">
              <I_Check size={15} style={{ color: 'var(--green)', flexShrink: 0 }} />
              <span className="guard-lb">No tocar el precio
                <small>Bajar $5 te cuesta margen y Tienda Norte puede bajar otra vez. La diferenciación aguanta, la guerra de precio no.</small>
              </span>
            </div>
          </div>
          <div className="row" style={{ gap: 9, marginTop: 14, flexWrap: 'wrap' }}>
            <Button className="btn-sm" title="Crea el borrador de la campaña con el ángulo ganador"
              onClick={() => setToast('Creando campaña con el ángulo "ingredientes limpios" (demo)')}>
              <I_Plus size={13} /> Atacar con esto
            </Button>
            <Button variant="ghost" className="btn-sm" title="Silencia este hallazgo por 7 días"
              onClick={() => setToast('Silenciado 7 días (demo)')}>Silenciar</Button>
          </div>
          <div className="acc-why">
            Cada recomendación sale de un dato de arriba. <b>Nada de esta pantalla es opinión</b>: o es un anuncio real de tu competencia, o es una métrica tuya.
          </div>
        </Card>
      </div>
    </div>
  );
}
