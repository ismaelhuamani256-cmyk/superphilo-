#!/usr/bin/env python3
"""
Genera los audios (podcast) del cours con voces neuronales LOCALES de Piper.
Salida: audio/<es|fr>/NN-id-completo.m4a, NN-id-tesis.m4a, reperes.m4a  +  audio/index.json
Los .m4a suenan en el celular con la pantalla bloqueada y sin internet (cópialos al teléfono).

Requisitos (una sola vez):
    python3 -m venv venv && venv/bin/pip install piper-tts      (+ ffmpeg instalado)
    descarga las voces .onnx y .onnx.json de https://huggingface.co/rhasspy/piper-voices :
        fr/fr_FR/siwis/medium/fr_FR-siwis-medium.*   y   es/es_ES/davefx/medium/es_ES-davefx-medium.*
Uso:
    venv/bin/python tools/generar-audios.py --voces RUTA_A_LAS_VOCES [--solo religion] [--bitrate 32k]
"""
import argparse, json, os, re, subprocess, sys, unicodedata, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument('--voces', required=True); ap.add_argument('--solo'); ap.add_argument('--bitrate', default='32k'); ap.add_argument('--out', default=str(ROOT / 'audio'))
args = ap.parse_args()

from piper import PiperVoice
VOICES = {'es': PiperVoice.load(f'{args.voces}/es_ES-davefx-medium.onnx'), 'fr': PiperVoice.load(f'{args.voces}/fr_FR-siwis-medium.onnx')}
SR = VOICES['es'].config.sample_rate
assert SR == VOICES['fr'].config.sample_rate

def clean(t):
    t = re.sub(r'\[…\]|\[\.\.\.\]', ', ', str(t or '')); t = t.replace('…', '.')
    t = re.sub(r'[«»“”"]', '', t); t = re.sub(r'\s*\((?:p\.?\s*\d+)\)', '', t)
    t = re.sub(r'[✦◆➜→↑↓]', ',', t); return re.sub(r'\s+', ' ', t).strip()

def chunks(t, n=300):
    t = clean(t)
    if len(t) <= n: return [t] if t else []
    out, cur = [], ''
    for s in re.findall(r'[^.!?;:]+[.!?;:]?\s*', t) or [t]:
        if len(cur) + len(s) > n and cur: out.append(cur.strip()); cur = s
        else: cur += s
    if cur.strip(): out.append(cur.strip())
    return out

def pcm(text, lang):
    buf = b''
    for part in chunks(text):
        for ch in VOICES[lang].synthesize(part): buf += ch.audio_int16_bytes
        buf += b'\x00\x00' * int(SR * 0.12)                       # respiro entre frases
    return buf

def render(items, path, title, lang_ui):
    """items: [(texto, idioma, pausa_seg)] → .m4a mono"""
    path.parent.mkdir(parents=True, exist_ok=True); tmp = path.with_suffix('.wav'); total = 0
    with wave.open(str(tmp), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        for text, lang, pause in items:
            if not clean(text): continue
            data = pcm(text, lang) + b'\x00\x00' * int(SR * pause); w.writeframes(data); total += len(data) // 2
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(tmp), '-ac', '1', '-c:a', 'aac', '-b:a', args.bitrate, '-metadata', f'title={title}', '-metadata', 'artist=PHILO BAC', '-metadata', f'album=PHILO BAC ({lang_ui})', '-movflags', '+faststart', str(path)], check=True)
    tmp.unlink(); return total / SR

def L(l, es, fr): return es if l == 'es' else fr

def items_completo(c, l):
    it = [(L(l, f'Noción {c["numero"]}. {c["titulo_es"]}. {c["titulo"]}.', f'Notion {c["numero"]}. {c["titulo"]}.'), l, 1.0), (c['resumen'], l, 1.0)]
    it.append((L(l, 'Los cinco puntos incontournables.', 'Les cinq points incontournables.'), l, 0.5))
    for i, x in enumerate(c['puntos_incontournables']): it.append((f'{i+1}. {x}', l, 0.6))
    for k in c['conceptos']: it.append((f'{k["nombre"]}. {k["definicion"]}', l, 0.7))
    for f in c['filosofos']:
        it.append((f'{f["nombre"]}. {f["epoca"]}.', l, 0.5)); it.append((L(l, 'Tesis principal. ', 'Thèse principale. ') + f['tesis_principal'], l, 0.6))
        for i, x in enumerate(f['ideas_clave']): it.append((L(l, 'Idea ', 'Idée ') + f'{i+1}. {x}', l, 0.5))
        for q in f.get('citas', []):
            it.append((L(l, f'Cita de {f["nombre"]}.', f'Citation de {f["nombre"]}.'), l, 0.3)); it.append((q['texto'], 'fr', 0.8))
        it.append((L(l, 'Cómo usarlo en la disertación. ', 'Comment l’utiliser en dissertation. ') + f['como_usarlo_en_disertacion'], l, 1.2))
    it.append((L(l, 'Problemáticas tipo bac. ', 'Problématiques type bac. ') + ' . '.join(c['problematicas_bac']), l, 0.5))
    return it

def items_tesis(c, l):
    it = [(L(l, f'Noción {c["numero"]}. {c["titulo_es"]}. {c["titulo"]}. Tesis de los autores.', f'Notion {c["numero"]}. {c["titulo"]}. Thèses des auteurs.'), l, 1.0)]
    for f in c['filosofos']: it.append((f'{f["nombre"]}. {f["tesis_principal"]}', l, 0.8))
    return it

def load(l):
    if l == 'es':
        caps = [json.loads(p.read_text('utf8')) for p in sorted((ROOT / 'data' / 'capitulos').glob('*.json'))]; ex = json.loads((ROOT / 'data' / 'extras.json').read_text('utf8'))
    else:
        caps = [json.loads(p.read_text('utf8')) for p in sorted((ROOT / 'data' / 'fr').glob('[0-9]*.json'))]; ex = json.loads((ROOT / 'data' / 'fr' / 'extras.json').read_text('utf8'))
    return sorted(caps, key=lambda c: c['numero']), ex

out = Path(args.out); index = []
for l in ('es', 'fr'):
    caps, ex = load(l)
    jobs = []
    for c in caps:
        if args.solo and c['id'] != args.solo: continue
        n = f'{c["numero"]:02d}-{c["id"]}'; t = c['titulo'] if l == 'fr' else f'{c["titulo"]} · {c["titulo_es"]}'
        jobs.append((out / l / f'{n}-completo.m4a', f'{t} — ' + L(l, 'capítulo completo', 'chapitre complet'), items_completo(c, l), c['id'], 'completo'))
        jobs.append((out / l / f'{n}-tesis.m4a', f'{t} — ' + L(l, 'tesis de los autores', 'thèses des auteurs'), items_tesis(c, l), c['id'], 'tesis'))
    if not args.solo:
        jobs.append((out / l / 'reperes.m4a', 'Repères', [(f'{r["termino_fr"]}. {r["definicion_es"]}', l, 0.8) for r in ex['reperes']], None, 'reperes'))
    for path, title, items, cid, kind in jobs:
        d = render(items, path, title, l); size = path.stat().st_size
        index.append({'lang': l, 'file': f'{l}/{path.name}', 'title': title, 'cap': cid, 'kind': kind, 'sec': round(d), 'bytes': size}); print(f'{path.name:34s} {d/60:5.1f} min  {size/1e6:5.2f} MB', flush=True)
if not args.solo:
    (out / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=1), 'utf8')
    print('TOTAL', round(sum(i['bytes'] for i in index) / 1e6, 1), 'MB', round(sum(i['sec'] for i in index) / 3600, 1), 'h')
