
import React, { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient";

const ADMIN_PASS = "rikokotas2026";
const LOGO_URL_DEFAULT = "/logo_rikokotas.png";
const WHATSAPP_NUMBER = "34603472511";

type Category = "TODOS" | "ROPA" | "CALZADOS" | "BOLSOS" | "PERFUMES" | "BISUTERÍA" | "MAQUILLAJE" | "ACCESORIOS" | "FAJAS" | "TALLADORES";
const CATEGORIES: Category[] = ["TODOS","ROPA","CALZADOS","BOLSOS","PERFUMES","BISUTERÍA","MAQUILLAJE","ACCESORIOS","FAJAS","TALLADORES"];

interface Product {
  id: string; nombre: string; precio: string; categoria: Category;
  talla: string; stock: number; descripcion: string; imagen: string; destacado?: boolean; orden?: number; created_at?: string;
}
interface StoreConfig {
  logo_url: string; direccion: string; whatsapp_display: string;
  hero_titulo: string; hero_subtitulo: string; banner_maxicoly: string; hero_imagen: string;
}

const DEFAULT_CONFIG: StoreConfig = {
  logo_url: LOGO_URL_DEFAULT,
  direccion: "Calle Ramón y Cajal 24, C.P 14100, La Carlota Córdoba.",
  whatsapp_display: "603 472 511",
  hero_titulo: "Moda, brillo y figura al instante.",
  hero_subtitulo: "Tienda de confianza en Calle Ramón y Cajal 24. Ropa, calzados, bolsos, perfumes y fajas colombianas originales.",
  banner_maxicoly: "Auténticas fajas colombianas de la Línea Maxicoly para España",
  hero_imagen: "",
};

export default function App(){
  const [productos, setProductos] = useState<Product[]>([]);
  const [config, setConfig] = useState<StoreConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [categoria, setCategoria] = useState<Category>("TODOS");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<Product|null>(null);
  const [selectedTalla, setSelectedTalla] = useState<string>("");
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [form, setForm] = useState<any>({ nombre:"", precio:"", categoria:"ROPA", talla:"S, M, L", stock:10, descripcion:"", imagen:"", destacado:false });
  const [editingId, setEditingId] = useState<string|null>(null);
  const [saving, setSaving] = useState(false);
  const [configForm, setConfigForm] = useState<StoreConfig>(DEFAULT_CONFIG);
  const productFileRef = useRef<HTMLInputElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  useEffect(()=>{ const check=()=>setIsAdminRoute(window.location.hash==="#admin"); check(); window.addEventListener("hashchange",check); return()=>window.removeEventListener("hashchange",check); },[]);

  const fetchAll = async()=>{
    setLoading(true);
    try{
      const { data: prod } = await supabase.from("productos").select("*").order("orden",{ascending:true, nullsFirst:false}).order("created_at",{ascending:false});
      if(prod){ setProductos(prod.map((d:any)=>({ id:d.id, nombre:d.nombre, precio:d.precio, categoria:d.categoria, talla:d.talla||"Única", stock: d.stock ?? 10, descripcion:d.descripcion, imagen:d.imagen, destacado:d.destacado, orden:d.orden ?? 0, created_at:d.created_at })) ); }
      const { data: cfg } = await supabase.from("tienda_config").select("*").limit(1).single();
      if(cfg){ const c={ logo_url:cfg.logo_url||DEFAULT_CONFIG.logo_url, direccion:cfg.direccion||DEFAULT_CONFIG.direccion, whatsapp_display:cfg.whatsapp_display||DEFAULT_CONFIG.whatsapp_display, hero_titulo:cfg.hero_titulo||DEFAULT_CONFIG.hero_titulo, hero_subtitulo:cfg.hero_subtitulo||DEFAULT_CONFIG.hero_subtitulo, banner_maxicoly:cfg.banner_maxicoly||DEFAULT_CONFIG.banner_maxicoly, hero_imagen:cfg.hero_imagen||"" }; setConfig(c); setConfigForm(c); }
    }catch(e){ console.log(e); }
    finally{ setLoading(false); }
  };
  useEffect(()=>{ fetchAll(); },[]);
  useEffect(()=>{
    if(preview){
      const tallas = preview.talla.split(',').map(t=>t.trim()).filter(Boolean);
      setSelectedTalla(tallas[0]||"");
    }
  },[preview]);

  const filtrados = useMemo(()=>{
    let list = categoria==="TODOS"?productos:productos.filter(p=>p.categoria===categoria);
    if(search.trim()){ const s=search.toLowerCase(); list=list.filter(p=>p.nombre.toLowerCase().includes(s) || p.descripcion.toLowerCase().includes(s) || p.categoria.toLowerCase().includes(s)); }
    return list.sort((a,b)=>(a.orden||0)-(b.orden||0));
  },[productos,categoria,search]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((res, rej)=>{
      const r = new FileReader();
      r.onload=()=>res(r.result as string);
      r.onerror=rej;
      r.readAsDataURL(file);
    });
  };
  const handleProductFile = async(e: React.ChangeEvent<HTMLInputElement>)=>{
    const file = e.target.files?.[0]; if(!file) return;
    if(file.size > 2*1024*1024){ alert("Imagen muy grande, max 2MB"); return; }
    const b64 = await fileToBase64(file);
    setForm((f:any)=>({...f, imagen:b64}));
  };
  const handleHeroFile = async(e: React.ChangeEvent<HTMLInputElement>)=>{
    const file = e.target.files?.[0]; if(!file) return;
    if(file.size > 3*1024*1024){ alert("Imagen portada max 3MB"); return; }
    const b64 = await fileToBase64(file);
    setConfigForm((f:any)=>({...f, hero_imagen:b64}));
  };
  const handleLogoFile = async(e: React.ChangeEvent<HTMLInputElement>)=>{
    const file = e.target.files?.[0]; if(!file) return;
    const b64 = await fileToBase64(file);
    setConfigForm((f:any)=>({...f, logo_url:b64}));
  };

  const handleSaveProduct = async()=>{
    if(!form.nombre.trim()||!form.precio.trim()||!form.imagen.trim()){ alert("Nombre, precio e imagen obligatorios"); return; }
    setSaving(true);
    try{
      const maxOrden = productos.length>0? Math.max(...productos.map(p=>p.orden||0)) : 0;
      const payload:any={ nombre:form.nombre.toUpperCase(), precio:form.precio, categoria:form.categoria, talla:form.talla, stock: Number(form.stock)||0, descripcion:form.descripcion, imagen:form.imagen, destacado:!!form.destacado };
      if(!editingId) payload.orden = maxOrden + 1;
      if(editingId){ const { error }=await supabase.from("productos").update(payload).eq("id",editingId); if(error) throw error; }
      else{ const { error }=await supabase.from("productos").insert(payload); if(error) throw error; }
      setForm({ nombre:"", precio:"", categoria:"ROPA", talla:"S, M, L", stock:10, descripcion:"", imagen:"", destacado:false }); setEditingId(null); await fetchAll(); alert("✓ Producto guardado");
    }catch(e:any){ alert("Error: "+e.message); } finally{ setSaving(false); }
  };

  const handleSaveConfig = async()=>{
    setSaving(true);
    try{
      const { data: existing } = await supabase.from("tienda_config").select("id").limit(1);
      if(existing && existing.length>0){ const { error }=await supabase.from("tienda_config").update(configForm).eq("id",existing[0].id); if(error) throw error; }
      else{ const { error }=await supabase.from("tienda_config").insert(configForm); if(error) throw error; }
      setConfig(configForm); alert("✓ Portada actualizada");
    }catch(e:any){ alert("Error: "+e.message); } finally{ setSaving(false); }
  };

  const deleteProd = async(id:string)=>{ if(!confirm("¿Borrar producto?")) return; const { error }=await supabase.from("productos").delete().eq("id",id); if(error) alert(error.message); else await fetchAll(); };
  const moveProduct = async(id:string, dir: 'up'|'down')=>{
    const sorted = [...productos].sort((a,b)=>(a.orden||0)-(b.orden||0));
    const idx = sorted.findIndex(p=>p.id===id); if(idx===-1) return;
    const newIdx = dir==='up'? idx-1 : idx+1; if(newIdx<0 || newIdx>=sorted.length) return;
    const a = sorted[idx]; const b = sorted[newIdx];
    await supabase.from("productos").update({orden: b.orden||0}).eq("id", a.id);
    await supabase.from("productos").update({orden: a.orden||0}).eq("id", b.id);
    await fetchAll();
  };

  if(loading) return <div className="min-h-screen flex items-center justify-center font-bold">Cargando...</div>;

  return (
    <div className="min-h-screen bg-[#FFFBFB] text-zinc-900">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@400;700&display=swap'); .serif{font-family:"Instrument Serif",serif} body{font-family:"DM Sans"}`}</style>
      <div className="w-full bg-zinc-900 text-white text-[11px]"><div className="max-w-[1280px] mx-auto px-4 h-8 flex justify-between items-center"><span>📍 {config.direccion}</span><span className="hidden md:inline">WhatsApp {config.whatsapp_display}</span></div></div>
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b"><div className="max-w-[1280px] mx-auto px-4 h-[72px] flex items-center justify-between"><a href="#" className="flex items-center gap-3"><img src={config.logo_url} className="h-14 w-14 rounded-full border shadow object-cover" /><div><div className="serif font-bold text-[20px]">LAS RIKOKOTAS II S.L.</div><div className="text-[10px] tracking-widest text-zinc-500 font-bold">BOUTIQUE • LA CARLOTA</div></div></a><div className="flex gap-2"><div className="hidden md:flex items-center bg-zinc-100 rounded-full px-3 h-9"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." className="bg-transparent outline-none text-[13px] w-32 md:w-48" />🔍</div><a href="#catalogo" className="h-9 px-4 rounded-full bg-pink-600 text-white text-sm font-bold flex items-center">Catálogo</a></div></div></header>

      {!isAdminRoute ? (
        <>
          <section className="max-w-[1280px] mx-auto px-4 pt-6">
            <div className="md:hidden mb-3 flex items-center bg-white border rounded-full px-4 h-11"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar fajas, vestidos, bolsos..." className="flex-1 bg-transparent outline-none text-[14px]" />🔍</div>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-8 rounded-[28px] bg-white border p-0 shadow relative overflow-hidden min-h-[380px] flex">
                {config.hero_imagen && <img src={config.hero_imagen} className="absolute inset-0 w-full h-full object-cover" />}
                {/* FONDO MENOS TRANSPARENTE - CAMBIO PRINCIPAL 1 */}
                <div className={`relative z-10 p-6 md:p-8 w-full flex flex-col justify-center ${config.hero_imagen ? 'bg-white/[0.94] md:bg-white/[0.90]' : ''}`}>
                  <div className="flex items-center gap-4 mb-4"><img src={config.logo_url} className="h-20 w-20 rounded-full border-2 border-white shadow-lg object-cover bg-white" /><div><div className="text-[11px] font-bold px-3 py-1 rounded-full bg-zinc-900 text-white inline-flex">BOUTIQUE OFICIAL</div><div className="mt-1 text-[11px] font-bold px-3 py-1 rounded-full bg-pink-600 text-white inline-flex">FAJAS MAXICOLY</div></div></div>
                  <h1 className="serif text-[34px] md:text-[46px] leading-[0.9] font-bold">{config.hero_titulo.split(" ").slice(0,-2).join(" ")} <span className="text-pink-600">{config.hero_titulo.split(" ").slice(-2).join(" ")}</span></h1>
                  <p className="mt-3 text-[14px] text-zinc-700 max-w-[50ch] font-medium">{config.hero_subtitulo}</p>
                  <div className="mt-5 flex gap-2"><a href="#catalogo" className="h-11 px-6 rounded-full bg-zinc-900 text-white text-sm font-bold flex items-center">Comprar ahora →</a><a href={`https://wa.me/${WHATSAPP_NUMBER}`} className="h-11 px-6 rounded-full bg-white border text-sm font-bold flex items-center shadow">WhatsApp</a></div>
                </div>
              </div>
              <div className="col-span-12 lg:col-span-4 rounded-[28px] bg-gradient-to-br from-zinc-900 via-pink-900 to-pink-600 p-6 text-white relative overflow-hidden">
                <div className="text-[10px] tracking-widest font-bold bg-white text-zinc-900 px-2.5 py-1 rounded-full inline-flex">MAXICOLY COLOMBIA</div>
                <h2 className="serif mt-3 text-[26px] leading-[0.95] font-bold">{config.banner_maxicoly}</h2>
                <p className="mt-2 text-[13px] text-pink-100">Fajas originales con garantía. Asesoría personalizada de tallas.</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]"><div className="rounded-xl bg-white/10 p-2.5 border border-white/10"><div className="font-bold">{productos.filter(p=>p.categoria==="FAJAS").length} Fajas</div><div className="text-pink-200">Disponibles</div></div><div className="rounded-xl bg-white/10 p-2.5 border border-white/10"><div className="font-bold">{productos.length} Productos</div><div className="text-pink-200">Boutique</div></div><div className="rounded-xl bg-white/10 p-2.5 border border-white/10"><div className="font-bold">Tallas</div><div className="text-pink-200">S-3XL</div></div></div>
                <button onClick={()=>{setCategoria("FAJAS"); document.getElementById('catalogo')?.scrollIntoView({behavior:'smooth'})}} className="mt-5 w-full h-11 rounded-full bg-white text-zinc-900 font-bold text-sm">Ver fajas Maxicoly →</button>
              </div>
            </div>
          </section>

          <section id="catalogo" className="max-w-[1280px] mx-auto px-4 mt-7">
            <div className="flex items-center justify-between"><h3 className="serif text-[22px] font-bold">Catálogo • {filtrados.length} {search && ` resultados para "${search}"`}</h3></div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">{CATEGORIES.map(cat=>{const active=categoria===cat; return <button key={cat} onClick={()=>setCategoria(cat)} className={`whitespace-nowrap h-9 px-4 rounded-full border text-[12px] font-bold ${active?'bg-zinc-900 text-white':'bg-white text-zinc-600 hover:bg-zinc-900 hover:text-white'}`}>{cat}</button>})}</div>
            <div className="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filtrados.map(p=>(
                <div key={p.id} onClick={()=>setPreview(p)} className="group bg-white border rounded-[18px] overflow-hidden cursor-pointer hover:border-zinc-300">
                  <div className="aspect-[3/4] bg-zinc-50 relative overflow-hidden"><img src={p.imagen} className="w-full h-full object-cover group-hover:scale-105 transition" /><div className="absolute top-2 left-2 text-[10px] font-bold bg-white/90 px-2 py-1 rounded-full shadow">STOCK {p.stock}</div>{p.stock===0 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-[12px]">AGOTADO</div>}<div className="absolute top-2 right-2 text-[9px] font-bold bg-zinc-900 text-white px-2 py-1 rounded-full">{p.categoria}</div></div>
                  <div className="p-3"><div className="text-[13px] font-bold line-clamp-2 min-h-[2.6em]">{p.nombre}</div><div className="mt-1 flex justify-between items-center"><span className="font-bold">{p.precio}</span><span className="text-[10px] text-zinc-400">{p.talla}</span></div><div className="mt-2 h-8 rounded-full bg-zinc-900 text-white text-[11px] font-bold flex items-center justify-center">Ver detalles</div></div>
                </div>
              ))}
            </div>
          </section>

          {preview && <div className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center p-0 md:p-4" onClick={()=>setPreview(null)}>
            <div className="bg-white rounded-t-[24px] md:rounded-[24px] w-full md:max-w-[460px] max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col" onClick={e=>e.stopPropagation()}>
              <div className="relative w-full flex-shrink-0 bg-zinc-50">
                <img src={preview.imagen} className="w-full h-auto max-h-[55vh] md:max-h-[60vh] object-contain mx-auto" />
                <button onClick={()=>setPreview(null)} className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/70 text-white flex items-center justify-center">✕</button>
              </div>
              <div className="p-5 overflow-y-auto">
                <div className="font-bold text-[18px] leading-tight">{preview.nombre}</div>
                <div className="text-[12px] text-zinc-500 mt-1">{preview.categoria} • STOCK {preview.stock} uds</div>
                <div className="text-[22px] font-bold mt-2">{preview.precio}</div>
                <div className="text-[13px] text-zinc-600 mt-2">{preview.descripcion}</div>
                
                {/* TALLAS SELECCIONABLES - CAMBIO PRINCIPAL 2 */}
                <div className="mt-4">
                  <div className="text-[12px] font-bold tracking-wide">TALLA: <span className="text-pink-600">{selectedTalla}</span></div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {preview.talla.split(',').map(t=>t.trim()).filter(Boolean).map(t=>(
                      <button key={t} onClick={()=>setSelectedTalla(t)} className={`h-9 px-4 rounded-full border text-[13px] font-bold transition ${selectedTalla===t ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-900'}`}>{t}</button>
                    ))}
                  </div>
                  <div className="mt-1 text-[11px] text-zinc-400">Selecciona tu talla antes de reservar</div>
                </div>

                <div className="mt-5 flex gap-2 pb-[env(safe-area-inset-bottom)]">
                  <button onClick={()=>setPreview(null)} className="flex-1 h-12 rounded-full border font-bold bg-white">Cerrar</button>
                  <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola! Me interesa ${preview.nombre} - Talla ${selectedTalla} - ${preview.precio}`)}`} className="flex-[1.6] h-12 rounded-full bg-zinc-900 text-white font-bold flex items-center justify-center text-[14px]">Reservar {selectedTalla && `talla ${selectedTalla}`} →</a>
                </div>
                <div className="text-[11px] text-zinc-400 mt-3 text-center">{config.direccion}</div>
              </div>
            </div>
          </div>}

          <footer className="mt-12 border-t py-8 text-center text-[11px] text-zinc-500">© {new Date().getFullYear()} LAS RIKOKOTAS II S.L. • {config.direccion} • WhatsApp {config.whatsapp_display}</footer>
        </>
      ) : (
        <div className="max-w-[1280px] mx-auto px-4 py-6">
          {!adminUnlocked ? (
            <div className="max-w-[420px] mx-auto mt-16 bg-white border rounded-[20px] p-6"><div className="flex items-center gap-3"><img src={config.logo_url} className="h-12 w-12 rounded-full object-cover" /><div className="font-bold">ADMIN BOUTIQUE</div></div><input type="password" value={passInput} onChange={e=>setPassInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&passInput===ADMIN_PASS)setAdminUnlocked(true)}} placeholder="rikokotas2026" className="mt-4 w-full h-11 rounded-xl border px-4" /><button onClick={()=>{if(passInput===ADMIN_PASS)setAdminUnlocked(true); else alert("Clave incorrecta")}} className="mt-3 w-full h-11 rounded-full bg-zinc-900 text-white font-bold">Entrar</button></div>
          ) : (
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-5">
                <div className="bg-white rounded-[20px] border p-5">
                  <h3 className="font-bold text-[16px]">Portada - Imagen y texto</h3>
                  <div className="mt-3 space-y-3">
                    <div><label className="text-[11px] font-bold">LOGO</label><div className="flex gap-2 mt-1"><button onClick={()=>logoFileRef.current?.click()} className="h-10 px-3 rounded-xl border bg-zinc-50 text-[12px] font-bold">📁 Subir logo local</button></div><input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} /><input value={configForm.logo_url.startsWith('data:')?'[Imagen local]':configForm.logo_url} onChange={e=>setConfigForm({...configForm, logo_url:e.target.value})} className="mt-1 w-full h-10 border rounded-xl px-3 text-sm" />{configForm.logo_url && <img src={configForm.logo_url} className="mt-2 w-16 h-16 rounded-full object-cover border" />}</div>
                    <div><label className="text-[11px] font-bold">IMAGEN DE FONDO PORTADA</label><div className="flex gap-2 mt-1"><button onClick={()=>heroFileRef.current?.click()} className="h-10 px-3 rounded-xl bg-zinc-900 text-white text-[12px] font-bold">🖼️ Subir imagen local</button><button onClick={()=>setConfigForm({...configForm, hero_imagen:""})} className="h-10 px-3 rounded-xl border text-[12px]">Quitar fondo y volver a blanco</button></div><input ref={heroFileRef} type="file" accept="image/*" className="hidden" onChange={handleHeroFile} />{configForm.hero_imagen && <img src={configForm.hero_imagen} className="mt-2 w-full h-36 object-cover rounded-xl border" />}</div>
                    <input value={configForm.hero_titulo} onChange={e=>setConfigForm({...configForm, hero_titulo:e.target.value})} className="w-full h-10 border rounded-xl px-3 text-sm" />
                    <textarea value={configForm.hero_subtitulo} onChange={e=>setConfigForm({...configForm, hero_subtitulo:e.target.value})} rows={2} className="w-full border rounded-xl p-2 text-sm" />
                    <input value={configForm.banner_maxicoly} onChange={e=>setConfigForm({...configForm, banner_maxicoly:e.target.value})} className="w-full h-10 border rounded-xl px-3 text-sm" />
                    <input value={configForm.direccion} onChange={e=>setConfigForm({...configForm, direccion:e.target.value})} className="w-full h-10 border rounded-xl px-3 text-sm" />
                    <input value={configForm.whatsapp_display} onChange={e=>setConfigForm({...configForm, whatsapp_display:e.target.value})} className="w-full h-10 border rounded-xl px-3 text-sm" />
                    <button onClick={handleSaveConfig} className="w-full h-11 rounded-full bg-pink-600 text-white font-bold">{saving?"Guardando...":"Guardar portada"}</button>
                  </div>
                  <h3 className="font-bold mt-8">{editingId?"Editar producto":"Añadir producto"}</h3>
                  <div className="mt-3 space-y-2">
                    <input value={form.nombre} onChange={e=>setForm({...form, nombre:e.target.value})} placeholder="Nombre" className="w-full h-11 border rounded-xl px-4 text-sm" />
                    <div className="grid grid-cols-2 gap-2"><input value={form.precio} onChange={e=>setForm({...form, precio:e.target.value})} placeholder="Precio" className="h-11 border rounded-xl px-3 text-sm" /><select value={form.categoria} onChange={e=>setForm({...form, categoria:e.target.value})} className="h-11 border rounded-xl px-3 text-sm bg-white">{CATEGORIES.filter(c=>c!=="TODOS").map(c=><option key={c}>{c}</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-2"><input value={form.talla} onChange={e=>setForm({...form, talla:e.target.value})} placeholder="Tallas S,M,L" className="h-11 border rounded-xl px-3 text-sm" /><input type="number" value={form.stock} onChange={e=>setForm({...form, stock:e.target.value})} className="h-11 border rounded-xl px-3 text-sm" /></div>
                    <div className="border-2 border-dashed rounded-xl p-3 bg-zinc-50"><div className="flex gap-2"><button onClick={()=>productFileRef.current?.click()} className="h-11 px-4 rounded-full bg-zinc-900 text-white text-[13px] font-bold">📁 Imagen local</button><input value={form.imagen.startsWith('data:')?'[Local]':form.imagen} onChange={e=>setForm({...form, imagen:e.target.value})} placeholder="O URL" className="flex-1 h-11 border rounded-xl px-3 text-sm" /></div><input ref={productFileRef} type="file" accept="image/*" className="hidden" onChange={handleProductFile} /></div>
                    {form.imagen && <img src={form.imagen} className="w-full h-48 object-contain rounded-xl border bg-white" />}
                    <textarea value={form.descripcion} onChange={e=>setForm({...form, descripcion:e.target.value})} rows={2} className="w-full border rounded-xl p-2 text-sm" />
                    <button onClick={handleSaveProduct} className="w-full h-11 rounded-full bg-zinc-900 text-white font-bold">{saving?"Guardando...":editingId?"Guardar cambios":"Añadir producto"}</button>
                  </div>
                </div>
              </div>
              <div className="col-span-12 lg:col-span-7"><div className="flex justify-between items-center"><h3 className="font-bold">Productos ({productos.length})</h3></div><div className="mt-4 space-y-2">{[...productos].sort((a,b)=>(a.orden||0)-(b.orden||0)).map((p,idx)=>(<div key={p.id} className="bg-white rounded-[16px] border p-3 flex gap-3 items-center"><img src={p.imagen} className="w-20 h-20 rounded-xl object-cover" /><div className="flex-1"><div className="text-[12px] font-bold">{p.nombre}</div><div className="text-[11px] text-zinc-500">{p.categoria} • {p.precio} • STOCK {p.stock}</div><div className="mt-2 flex gap-1"><button onClick={()=>{setForm({nombre:p.nombre,precio:p.precio,categoria:p.categoria,talla:p.talla,stock:p.stock,descripcion:p.descripcion,imagen:p.imagen,destacado:!!p.destacado}); setEditingId(p.id)}} className="h-7 px-3 rounded-full bg-zinc-900 text-white text-[11px]">Editar</button><button onClick={()=>deleteProd(p.id)} className="h-7 px-3 rounded-full bg-zinc-100 text-[11px]">Borrar</button></div></div><div className="flex flex-col gap-1"><button onClick={()=>moveProduct(p.id,'up')} disabled={idx===0} className="h-7 w-7 rounded-full bg-white border flex items-center justify-center disabled:opacity-30">↑</button><button onClick={()=>moveProduct(p.id,'down')} disabled={idx===productos.length-1} className="h-7 w-7 rounded-full bg-white border flex items-center justify-center disabled:opacity-30">↓</button></div></div>))}</div></div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
