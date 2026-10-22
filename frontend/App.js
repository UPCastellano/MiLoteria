import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  ImageBackground,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchPrediction } from './src/api';

const GOLD = '#d4af37';
const GOLD_SOFT = '#f1d98a';
const BG = '#060608';
const PANEL = '#101015';
const BORDER = '#24242c';
const MUTED = '#8a8a99';
const ACCENT = '#7a1f2b'; // vino muy oscuro, solo detalles sutiles

const loop = (anim, from, to, duration) =>
  Animated.loop(
    Animated.sequence([
      Animated.timing(anim, { toValue: to, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      Animated.timing(anim, { toValue: from, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
    ])
  );

const FadeIn = ({ delay = 0, children, style }) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 600, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        { width: '100%', alignItems: 'center', opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

const Bulb = ({ index }) => {
  const o = useRef(new Animated.Value(0.25)).current;
  useEffect(() => {
    const t = setTimeout(() => loop(o, 0.25, 1, 700).start(), index * 140);
    return () => clearTimeout(t);
  }, [o, index]);
  return <Animated.View style={[styles.bulb, { opacity: o }]} />;
};

const Bulbs = () => (
  <View style={styles.bulbs}>
    {Array.from({ length: 14 }).map((_, i) => (
      <Bulb key={i} index={i} />
    ))}
  </View>
);

const Ball = ({ digit, index }) => {
  const s = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(s, { toValue: 1, delay: 300 + index * 150, friction: 4, tension: 90, useNativeDriver: false }).start();
  }, [s, index]);
  return (
    <Animated.View style={[styles.ball, { transform: [{ scale: s }, { rotate: s.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] }) }] }]}>
      <Text style={styles.ballText}>{digit}</Text>
    </Animated.View>
  );
};

const Bar = ({ digito, valor, max, destacado, index }) => {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: valor / max, duration: 800, delay: index * 60, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [w, valor, max, index]);
  return (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, destacado && { color: GOLD }]}>{digito}</Text>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            destacado && styles.barBest,
            { width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        />
      </View>
      <Text style={[styles.barValue, destacado && { color: GOLD_SOFT }]}>{valor.toFixed(1)}%</Text>
    </View>
  );
};

const Digit = ({ digit, active, onPress }) => {
  const glow = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (active) {
      const l = loop(glow, 0, 1, 1100);
      l.start();
      Animated.sequence([
        Animated.timing(pop, { toValue: 1.18, duration: 140, useNativeDriver: false }),
        Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: false }),
      ]).start();
      return () => l.stop();
    }
    glow.setValue(0);
  }, [active, glow, pop]);
  return (
    <Animated.Text
      onPress={onPress}
      style={[
        styles.digit,
        {
          transform: [{ scale: pop }],
          opacity: active ? 1 : 0.55,
          textShadowRadius: glow.interpolate({ inputRange: [0, 1], outputRange: [4, 26] }),
        },
      ]}
    >
      {digit}
    </Animated.Text>
  );
};

const Section = ({ children }) => (
  <Text style={styles.section}>
    <Text style={{ color: ACCENT }}>◆ </Text>
    {children}
    <Text style={{ color: ACCENT }}> ◆</Text>
  </Text>
);

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState(0);
  const zoom = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loop(zoom, 1, 1.12, 9000).start();
    loop(pulse, 0, 1, 1600).start();
  }, [zoom, pulse]);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchPrediction(refresh));
    } catch (e) {
      setError('No se pudo conectar con el servidor. ¿Está corriendo el backend?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const posicion = data?.posiciones[pos];
  const max = posicion ? Math.max(...posicion.distribucion.map((d) => d.probabilidad)) : 1;
  const ultimo = data?.ultimos[0];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={() => load(true)} tintColor={GOLD} />}
      >
        <View style={styles.heroWrap}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: zoom }] }]}>
            <ImageBackground source={require('./assets/casino.jpg')} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <View style={styles.heroOverlay}>
            <Text style={styles.suits}>♠ ♥ ♣ ♦</Text>
            <Text style={styles.brand}>LOTERÍA NACIONAL</Text>
            <Text style={styles.brandSub}>NICARAGUA · ANÁLISIS DE LA SUERTE</Text>
          </View>
        </View>
        <Bulbs />

        {loading && !data && <ActivityIndicator size="large" color={GOLD} style={{ marginTop: 40 }} />}
        {error && <Text style={styles.error}>{error}</Text>}

        {data && (
          <View style={styles.body}>
            <FadeIn delay={100}>
              <Section>Último número ganador</Section>
              <Animated.View
                style={[
                  styles.winnerCard,
                  { shadowOpacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.6] }) },
                ]}
              >
                <Text style={styles.winnerLabel}>
                  SORTEO {ultimo.sorteo} · {ultimo.fecha}
                </Text>
                <View style={styles.numberRow}>
                  {ultimo.numero.split('').map((d, i) => (
                    <Ball key={`${ultimo.sorteo}-${i}`} digit={d} index={i} />
                  ))}
                </View>
                <Text style={styles.prize}>{ultimo.premio}</Text>
                <View style={styles.place}>
                  <Text style={styles.placeText}>📍 La suerte cayó en {ultimo.sucursal}</Text>
                </View>
              </Animated.View>
            </FadeIn>

            <FadeIn delay={350}>
              <Section>Número recomendado</Section>
              <View style={styles.numberRow}>
                {data.numero.split('').map((d, i) => (
                  <Digit key={i} digit={d} active={i === pos} onPress={() => setPos(i)} />
                ))}
              </View>
              <Text style={styles.sub}>Basado en {data.sorteos_analizados} sorteos · toca un dígito para ver su detalle</Text>
            </FadeIn>

            <FadeIn delay={550}>
              <Section>Otras 3 posibilidades</Section>
              <View style={styles.altRow}>
                {data.alternativas.map((a, i) => (
                  <View key={a.numero} style={styles.altCard}>
                    <Text style={styles.altRank}>#{i + 2}</Text>
                    <Text style={styles.altNum}>{a.numero}</Text>
                    <Text style={styles.altMeta}>{a.veces_azar}× azar</Text>
                  </View>
                ))}
              </View>
            </FadeIn>

            <FadeIn delay={750}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Posición {posicion.posicion}: probabilidad por dígito</Text>
                {posicion.distribucion.map((d, i) => (
                  <Bar
                    key={`${pos}-${d.digito}`}
                    index={i}
                    digito={d.digito}
                    valor={d.probabilidad}
                    max={max}
                    destacado={d.digito === posicion.digito}
                  />
                ))}
                <Text style={styles.note}>Azar puro: 10% por dígito</Text>
              </View>
            </FadeIn>

            <FadeIn delay={950}>
              <Section>Últimos 5 ganadores</Section>
              <View style={styles.card}>
                {data.ultimos.map((u, i) => (
                  <View key={u.sorteo} style={[styles.draw, i === data.ultimos.length - 1 && { borderBottomWidth: 0 }]}>
                    <View>
                      <Text style={styles.drawNum}>{u.numero}</Text>
                      <Text style={styles.drawMeta}>
                        Sorteo {u.sorteo} · {u.fecha}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.drawPlace}>📍 {u.sucursal}</Text>
                      <Text style={styles.drawMeta}>{u.premio}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <Text style={styles.warning}>⚠️ {data.advertencia}</Text>
            </FadeIn>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { alignItems: 'center', maxWidth: 640, width: '100%', alignSelf: 'center', paddingBottom: 30 },
  heroWrap: { width: '100%', height: 210, overflow: 'hidden', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  heroOverlay: { flex: 1, backgroundColor: 'rgba(6,6,8,0.72)', alignItems: 'center', justifyContent: 'center' },
  suits: { color: GOLD, fontSize: 20, letterSpacing: 10, opacity: 0.8 },
  brand: { color: GOLD_SOFT, fontSize: 30, fontWeight: '900', letterSpacing: 3, textAlign: 'center', textShadowColor: GOLD, textShadowRadius: 14 },
  brandSub: { color: '#cfcfda', fontSize: 11, letterSpacing: 2, marginTop: 4, textAlign: 'center' },
  bulbs: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 14, marginTop: -6 },
  bulb: { width: 7, height: 7, borderRadius: 4, backgroundColor: GOLD },
  body: { width: '100%', paddingHorizontal: 16, alignItems: 'center' },
  section: { color: GOLD, fontSize: 13, letterSpacing: 3, textTransform: 'uppercase', marginTop: 28, marginBottom: 12, textAlign: 'center', fontWeight: '700' },
  winnerCard: {
    width: '100%',
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: GOLD,
    padding: 18,
    alignItems: 'center',
    shadowColor: GOLD,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  winnerLabel: { color: MUTED, fontSize: 12, letterSpacing: 2 },
  ball: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f6ecd0',
    borderWidth: 3,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  ballText: { color: '#14110a', fontSize: 28, fontWeight: '900' },
  prize: { color: GOLD_SOFT, fontSize: 26, fontWeight: '900', marginTop: 14 },
  place: { backgroundColor: '#1d1d25', borderWidth: 1, borderColor: GOLD, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, marginTop: 12 },
  placeText: { color: GOLD_SOFT, fontWeight: '700', fontSize: 14 },
  numberRow: { flexDirection: 'row', marginTop: 12, justifyContent: 'center' },
  digit: { color: GOLD_SOFT, fontSize: 64, fontWeight: '900', marginHorizontal: 3, textShadowColor: GOLD, textShadowOffset: { width: 0, height: 0 } },
  sub: { color: MUTED, fontSize: 12, textAlign: 'center' },
  altRow: { flexDirection: 'row', width: '100%', gap: 10 },
  altCard: { flex: 1, minWidth: 0, backgroundColor: PANEL, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center', borderWidth: 1, borderColor: BORDER, borderTopColor: GOLD },
  altRank: { color: MUTED, fontSize: 11, fontWeight: '700' },
  altNum: { color: '#f2f2f7', fontSize: 19, fontWeight: '800', marginVertical: 4, textAlign: 'center' },
  altMeta: { color: GOLD, fontSize: 11, textAlign: 'center' },
  card: { backgroundColor: PANEL, borderRadius: 16, padding: 16, width: '100%', borderWidth: 1, borderColor: BORDER, marginTop: 16 },
  cardTitle: { color: '#ececf4', fontSize: 15, fontWeight: '700', marginBottom: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  barLabel: { color: MUTED, width: 18, fontWeight: '700' },
  barTrack: { flex: 1, height: 10, backgroundColor: '#1b1b22', borderRadius: 5, marginHorizontal: 8, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5, backgroundColor: '#3d3d4d' },
  barBest: { backgroundColor: GOLD },
  barValue: { color: MUTED, width: 52, textAlign: 'right', fontSize: 12 },
  note: { color: '#5d5d6c', fontSize: 11, marginTop: 8 },
  draw: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  drawNum: { color: '#f2f2f7', fontSize: 22, fontWeight: '800', letterSpacing: 3 },
  drawPlace: { color: GOLD, fontSize: 13, fontWeight: '700' },
  drawMeta: { color: MUTED, fontSize: 12 },
  error: { color: '#e07a7a', textAlign: 'center', marginTop: 30 },
  warning: { color: '#9a8450', fontSize: 12, textAlign: 'center', marginTop: 24 },
});
