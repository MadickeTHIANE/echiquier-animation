import subprocess, re, sys, json
f=sys.argv[1]; noise=sys.argv[2] if len(sys.argv)>2 else "-35"
out=subprocess.run(["ffmpeg","-hide_banner","-i",f,"-af",f"silencedetect=noise={noise}dB:d=0.25","-f","null","-"],capture_output=True,text=True).stderr
dur=float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",f],capture_output=True,text=True).stdout)
st=[float(x) for x in re.findall(r"silence_start: ([0-9.]+)",out)]; en=[float(x) for x in re.findall(r"silence_end: ([0-9.]+)",out)]
# morceaux de son entre les silences
sp=[]; p=0.0
for a,b in zip(st,en+[dur]):
    if a-p>0.02: sp.append([p,a])
    p=b
if dur-p>0.02 and len(en)==len(st): sp.append([p,dur])
sp=[s for s in sp if s[1]-s[0]>=0.25]            # souffles et clics ignorés
# regroupement : une pause de moins de GAP secondes reste dans la même phrase
GAP=float(sys.argv[3]) if len(sys.argv)>3 else 1.2
ph=[]
for s in sp:
    if ph and s[0]-ph[-1][1]<GAP: ph[-1][1]=s[1]
    else: ph.append(s[:])
json.dump(ph,open("phrases.json","w"))
print(len(ph),"phrases (pause >=",GAP,"s)")
for i,(a,b) in enumerate(ph):
    gap = ph[i+1][0]-b if i+1<len(ph) else dur-b
    print(f"{i+1:2d}  {a:6.1f}-{b:6.1f}  durée {b-a:4.1f}s  pause après {gap:4.1f}s")
