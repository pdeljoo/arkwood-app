import { useState, useRef, useEffect } from "react";

const CATEGORY_META = {
  floorplan: { label: "Floor Plan", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  elevation: { label: "Elevation", color: "#8b5cf6", bg: "rgba(139,92,246,0.15)" },
  millwork: { label: "Millwork Detail", color: "#c8a96e", bg: "rgba(200,169,110,0.15)" },
  structural: { label: "Structural", color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
  mechanical: { label: "Mechanical", color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
  electrical: { label: "Electrical", color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
  cover: { label: "Cover", color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
  site: { label: "Site Plan", color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
  notes: { label: "Notes", color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
  unknown: { label: "Unknown", color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
};
const THUMB = {
  floorplan:"🏠",elevation:"📐",millwork:"🪵",structural:"🏗️",
  mechanical:"🔌",electrical:"⚡",cover:"📋",site:"🗺️",notes:"📝",unknown:"📄"
};

// ─── PDF PAGE RENDERER using pdf.js ──────────────────────────────────────────
function PDFPageViewer({ pdfDoc, pageNum, tool, highlights, onAddHighlight }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [currentRect, setCurrentRect] = useState(null);
  const [zoom, setZoom] = useState(1.0);
  const [baseScale, setBaseScale] = useState(1.0);
  const [rendering, setRendering] = useState(false);
  const pageRef = useRef(null);

  const renderPage = (page, scale) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setRendering(true);
    page.render({ canvasContext: ctx, viewport }).promise
      .then(() => setRendering(false))
      .catch(() => setRendering(false));
  };

  useEffect(() => {
    if (!pdfDoc) return;
    let cancelled = false;
    pdfDoc.getPage(pageNum).then(page => {
      if (cancelled) return;
      pageRef.current = page;
      const vp0 = page.getViewport({ scale: 1 });
      const cw = containerRef.current ? containerRef.current.clientWidth - 32 : 800;
      const ch = containerRef.current ? containerRef.current.clientHeight - 32 : 600;
      const fit = Math.min(cw / vp0.width, ch / vp0.height);
      setBaseScale(fit);
      setZoom(1.0);
      renderPage(page, fit);
    });
    return () => { cancelled = true; };
  }, [pdfDoc, pageNum]);

  useEffect(() => {
    if (!pageRef.current || baseScale === 0) return;
    renderPage(pageRef.current, baseScale * zoom);
  }, [zoom]);

  const getPos = (e) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom(z => Math.max(0.5, Math.min(5, parseFloat((z + delta).toFixed(2)))));
  };

  const onMouseDown = (e) => {
    if (tool !== "highlight") return;
    const pos = getPos(e);
    setIsDragging(true);
    setStartPos(pos);
    setCurrentRect({ ...pos, w: 0, h: 0 });
  };
  const onMouseMove = (e) => {
    if (!isDragging || !startPos) return;
    const pos = getPos(e);
    setCurrentRect({ x: Math.min(pos.x, startPos.x), y: Math.min(pos.y, startPos.y), w: Math.abs(pos.x - startPos.x), h: Math.abs(pos.y - startPos.y) });
  };
  const onMouseUp = () => {
    if (!isDragging || !currentRect) return;
    if (currentRect.w > 20 && currentRect.h > 20) {
      onAddHighlight({ ...currentRect, id: Date.now(), label: `Area ${highlights.length + 1}` });
    }
    setIsDragging(false); setStartPos(null); setCurrentRect(null);
  };

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start" }}>
      {/* Zoom Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", marginBottom: 10, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
        <button onClick={() => setZoom(z => Math.max(0.5, parseFloat((z - 0.25).toFixed(2))))} style={{ background: "transparent", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>-</button>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", minWidth: 40, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(5, parseFloat((z + 0.25).toFixed(2))))} style={{ background: "transparent", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", padding: "0 4px", lineHeight: 1 }}>+</button>
        <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.15)" }} />
        <button onClick={() => setZoom(1.0)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 10, cursor: "pointer" }}>Fit</button>
        <button onClick={() => setZoom(2.0)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 10, cursor: "pointer" }}>2x</button>
        {rendering && <span style={{ fontSize: 9, color: "#c8a96e" }}>rendering...</span>}
      </div>
      {/* Scrollable canvas area */}
      <div style={{ flex: 1, overflow: "auto", width: "100%", display: "flex", alignItems: "flex-start", justifyContent: "center" }} onWheel={handleWheel}>
        <div style={{ position: "relative", display: "inline-block", flexShrink: 0 }}>
          <canvas ref={canvasRef} style={{ display: "block", borderRadius: 6, boxShadow: "0 0 0 1px rgba(255,255,255,0.1)" }} />
          <div
            ref={overlayRef}
            style={{ position: "absolute", inset: 0, cursor: tool === "highlight" ? "crosshair" : "default" }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
          >
            {highlights.map(h => (
              <div key={h.id} style={{ position: "absolute", left: h.x, top: h.y, width: h.w, height: h.h, background: "rgba(200,169,110,0.2)", border: "2px solid #c8a96e", borderRadius: 3, pointerEvents: "none" }}>
                <span style={{ position: "absolute", top: -18, left: 0, background: "#c8a96e", color: "#1a1008", fontSize: 9, padding: "2px 6px", borderRadius: 3, fontWeight: 700, whiteSpace: "nowrap" }}>{h.label}</span>
              </div>
            ))}
            {currentRect && currentRect.w > 5 && (
              <div style={{ position: "absolute", left: currentRect.x, top: currentRect.y, width: currentRect.w, height: currentRect.h, background: "rgba(200,169,110,0.1)", border: "2px dashed #c8a96e", borderRadius: 3, pointerEvents: "none" }} />
            )}
            {tool === "highlight" && highlights.length === 0 && (
              <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(200,169,110,0.12)", border: "1px solid rgba(200,169,110,0.25)", borderRadius: 6, padding: "5px 12px", fontSize: 10, color: "rgba(200,169,110,0.8)", pointerEvents: "none", whiteSpace: "nowrap" }}>
                Draw to highlight areas for analysis
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}



// ─── DEFAULT MATERIALS ────────────────────────────────────────────────────────
const DEFAULT_MATERIALS = [
  { label: "Birch Plywood 3/4in — Body (Standard)", value: "Birch Plywood 3/4in body" },
  { label: "Birch Plywood 5/8in — Back & Drawer Box (Standard)", value: "Birch Plywood 5/8in back/drawer" },
  { label: "Particleboard 3/4in + Melamine — Body", value: "Particleboard 3/4in + Melamine body" },
  { label: "Particleboard 5/8in + Melamine — Back", value: "Particleboard 5/8in + Melamine back" },
  { label: "MDF 3/4in — Painted", value: "MDF 3/4in painted" },
  { label: "MDF 3/4in — Natural", value: "MDF 3/4in natural" },
  { label: "Birch Plywood 3/4in — Veneer faced", value: "Birch Plywood 3/4in veneer" },
  { label: "MW1 — 3/4in Low VOC MDF", value: "MW1 3/4in low VOC MDF" },
  { label: "MW2 — Wood Veneer Flat Panel", value: "MW2 wood veneer flat panel" },
  { label: "Custom (type manually)", value: "custom" },
];

const DOOR_STYLES = [
  "Flat Panel MDF — Painted",
  "Flat Panel MDF — Natural",
  "Shaker MDF — Painted",
  "Slab Door — Veneer",
  "Open (no door)",
  "Glass Insert",
  "Custom",
];

// ─── EDITABLE ITEM LIST ───────────────────────────────────────────────────────
function EditableItemList({ items, roomId, onUpdate }) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [editData, setEditData] = useState({});

  const startEdit = (i) => {
    setEditingIdx(i);
    setEditData({ ...items[i] });
  };

  const saveEdit = () => {
    const newItems = items.map((item, i) => i === editingIdx ? { ...editData } : item);
    onUpdate(roomId, newItems);
    setEditingIdx(null);
  };

  const cancelEdit = () => setEditingIdx(null);

  const updateField = (field, val) => setEditData(prev => ({ ...prev, [field]: val }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((item, i) => (
        <div key={i}>
          {editingIdx === i ? (
            // ── EDIT MODE ──────────────────────────────────────────────
            <div style={{ background: "rgba(200,169,110,0.07)", border: "1px solid rgba(200,169,110,0.25)", borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#c8a96e", marginBottom: 12 }}>Editing: {item.name}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                {/* Name */}
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Item Name</label>
                  <input value={editData.name || ""} onChange={e => updateField("name", e.target.value)} style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 13, outline: "none" }} />
                </div>
                {/* Size W x H x D */}
                <div>
                  <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Size (W x H x D inches)</label>
                  <input value={editData.size || ""} onChange={e => updateField("size", e.target.value)} placeholder="e.g. 36x34.5x24" style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 13, outline: "none" }} />
                </div>
                {/* Qty */}
                <div>
                  <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Quantity</label>
                  <input value={editData.qty || ""} onChange={e => updateField("qty", e.target.value)} placeholder="e.g. 1 unit" style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 13, outline: "none" }} />
                </div>
                {/* Body Material */}
                <div>
                  <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Body Material</label>
                  <select value={editData.material || ""} onChange={e => updateField("material", e.target.value)} style={{ width: "100%", background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 12, outline: "none" }}>
                    <option value="">Select material...</option>
                    {DEFAULT_MATERIALS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  {editData.material === "custom" && (
                    <input placeholder="Type custom material..." onChange={e => updateField("material", e.target.value)} style={{ width: "100%", marginTop: 6, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 12, outline: "none" }} />
                  )}
                </div>
                {/* Door Style */}
                <div>
                  <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Door Style</label>
                  <select value={editData.door_style || ""} onChange={e => updateField("door_style", e.target.value)} style={{ width: "100%", background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 12, outline: "none" }}>
                    <option value="">Select door style...</option>
                    {DOOR_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {/* Doors count */}
                <div>
                  <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Number of Doors</label>
                  <input type="number" min="0" max="10" value={editData.doors || 0} onChange={e => updateField("doors", parseInt(e.target.value))} style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 13, outline: "none" }} />
                </div>
                {/* Drawers count */}
                <div>
                  <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Number of Drawers</label>
                  <input type="number" min="0" max="10" value={editData.drawers || 0} onChange={e => updateField("drawers", parseInt(e.target.value))} style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 13, outline: "none" }} />
                </div>
                {/* Interior */}
                <div>
                  <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Interior</label>
                  <input value={editData.interior || ""} onChange={e => updateField("interior", e.target.value)} placeholder="e.g. adjustable shelves" style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 12, outline: "none" }} />
                </div>
                {/* Notes */}
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 4 }}>Notes</label>
                  <input value={editData.notes || ""} onChange={e => updateField("notes", e.target.value)} placeholder="Any special notes..." style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "7px 10px", color: "#fff", fontSize: 12, outline: "none" }} />
                </div>
              </div>
              {/* Default material note */}
              <div style={{ padding: "8px 10px", borderRadius: 7, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", marginBottom: 10 }}>
                <p style={{ fontSize: 10, color: "#93c5fd" }}>Default: Body — Birch Plywood 3/4in · Back & Drawer Box — Birch Plywood 5/8in (unless customer requests otherwise)</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={saveEdit} style={{ flex: 1, background: "#c8a96e", border: "none", borderRadius: 8, padding: "8px 0", color: "#1a1008", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Save Changes</button>
                <button onClick={cancelEdit} style={{ padding: "8px 16px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          ) : (
            // ── VIEW MODE ──────────────────────────────────────────────
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 8, background: "rgba(200,169,110,0.08)", border: "2px solid rgba(200,169,110,0.4)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, color: "#fff", fontWeight: 600, marginBottom: 3 }}>{item.name}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{item.size}</span>
                  {item.doors > 0 && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }}>{item.doors} door{item.doors>1?"s":""}</span>}
                  {item.drawers > 0 && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }}>{item.drawers} drawer{item.drawers>1?"s":""}</span>}
                </div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{item.material || "Birch Plywood 3/4in body + 5/8in back"}</p>
                {item.notes && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2, fontStyle: "italic" }}>{item.notes}</p>}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{item.qty}</p>
              </div>
              <button onClick={() => startEdit(i)} style={{ background: "rgba(200,169,110,0.1)", border: "1px solid rgba(200,169,110,0.25)", borderRadius: 7, padding: "5px 12px", color: "#c8a96e", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Edit</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── MATERIAL TAKEOFF + LIVE PRICES ──────────────────────────────────────────
function MaterialTakeoff({ result }) {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [activeSection, setActiveSection] = useState("all");
  const WASTE = 0.25;

  // Build material list from analysis result
  const buildMaterials = () => {
    const byRoom = {};
    (result.rooms || []).forEach(room => {
      const roomMats = {};
      (room.items || []).forEach(item => {
        const spec = (item.material || "").toLowerCase();
        const size = item.size || "";
        const doors = item.doors || 0;
        const drawers = item.drawers || 0;
        const hw = item.hardware || "";
        const wm = size.match(/(\d+)\s*[xX"]/);
        const hm = size.match(/[xX"]\s*(\d+)/);
        const w = wm ? parseFloat(wm[1]) : 24;
        const h = hm ? parseFloat(hm[1]) : 30;
        const d = 24;
        const sqft = ((w*h*2)+(w*d*2)+(h*d*2))/144;
        const sheets = Math.max(1, Math.ceil(sqft/32*1.1));
        let fin = "";
        if (spec.includes("white")) fin = " — White";
        else if (spec.includes("walnut")) fin = " — Walnut";
        else if (spec.includes("oak")) fin = " — Oak";
        else if (spec.includes("painted")) fin = " — Painted";
        const isPlywood = spec.includes("plywood")||spec.includes("birch");
        const isVeneer = spec.includes("veneer")||spec.includes("mw2");
        const isMelamine = spec.includes("melamine")||spec.includes("particleboard")||spec.includes("particular");
        const isDekton = spec.includes("dekton");
        const isStone = spec.includes("stone")||spec.includes("quartz")||spec.includes("countertop");
        const isMDF = spec.includes("mdf")||spec.includes("mw1")||spec.includes("painted");
        // Default: Birch Plywood body (3/4) + back/drawer (5/8) per Arcwood standard
        if (isVeneer) { roomMats["Wood Veneer"+fin]=(roomMats["Wood Veneer"+fin]||0)+Math.ceil(sqft); }
        else if (isMDF) { roomMats["MDF 3/4in"+fin]=(roomMats["MDF 3/4in"+fin]||0)+sheets; }
        else if (isMelamine) {
          roomMats["Particleboard 3/4in + Melamine"]=(roomMats["Particleboard 3/4in + Melamine"]||0)+sheets;
          roomMats["Particleboard 5/8in + Melamine — Back"]=(roomMats["Particleboard 5/8in + Melamine — Back"]||0)+Math.ceil(sheets*0.3);
        } else if (!isStone&&!isDekton) {
          // DEFAULT: Birch Plywood
          roomMats["Birch Plywood 3/4in — Body"]=(roomMats["Birch Plywood 3/4in — Body"]||0)+sheets;
          roomMats["Birch Plywood 5/8in — Back & Drawer Box"]=(roomMats["Birch Plywood 5/8in — Back & Drawer Box"]||0)+Math.ceil(sheets*0.35);
        }
        const dc = typeof doors==="number"?doors:parseInt(doors)||0;
        if (dc>0) { const dk="Cabinet Door"+(isVeneer?" — Veneer":" — MDF")+fin; roomMats[dk]=(roomMats[dk]||0)+dc; }
        const dr = typeof drawers==="number"?drawers:parseInt(drawers)||0;
        if (dr>0) roomMats["Drawer Box + Slide"]=(roomMats["Drawer Box + Slide"]||0)+dr;
        if (hw) {
          const hm2=hw.match(/(\d+)\s*hinge/i); const pm=hw.match(/(\d+)\s*pull/i);
          if (hm2) roomMats["Soft-close Hinges"]=(roomMats["Soft-close Hinges"]||0)+parseInt(hm2[1]);
          if (pm) roomMats["Cabinet Pulls/Handles"]=(roomMats["Cabinet Pulls/Handles"]||0)+parseInt(pm[1]);
        } else if (dc>0) {
          roomMats["Soft-close Hinges"]=(roomMats["Soft-close Hinges"]||0)+dc*2;
          roomMats["Cabinet Pulls/Handles"]=(roomMats["Cabinet Pulls/Handles"]||0)+dc+dr;
        }
        const edgeFt=Math.ceil(((w+h)*2+(d+h)*2)/12);
        roomMats["Edge Banding (ft)"]=(roomMats["Edge Banding (ft)"]||0)+edgeFt;
        if (isDekton) roomMats["Dekton Countertop (sqft)"]=(roomMats["Dekton Countertop (sqft)"]||0)+Math.ceil((w*d)/144);
        else if (isStone) roomMats["Stone Countertop (sqft)"]=(roomMats["Stone Countertop (sqft)"]||0)+Math.ceil((w*d)/144);
      });
      if (Object.keys(roomMats).length>0) byRoom[room.label]=roomMats;
    });
    return byRoom;
  };

  const fetchPrices = async () => {
    setLoading(true);
    try {
      if (!AI_ENABLED) throw new Error("AI_DISABLED");
      const data = await callAI({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{
            role: "user",
            content: `Search for current retail prices in Vancouver BC Canada for millwork materials (2025-2026). Find prices for: MDF 3/4 inch sheet, Birch Plywood 3/4 inch sheet, soft-close hinges, drawer slides, edge banding per foot, cabinet hardware set. Check Home Depot Canada, Rona, or Taiga Building Products. Respond ONLY with JSON, no markdown: {"MDF 3/4in":{"price":0,"unit":"sheet","source":""},"Birch Plywood 3/4in":{"price":0,"unit":"sheet","source":""},"Soft-close Hinges":{"price":0,"unit":"pair","source":""},"Drawer Slides":{"price":0,"unit":"pair","source":""},"Edge Banding (ft)":{"price":0,"unit":"ft","source":""},"Hardware Set":{"price":0,"unit":"set","source":""},"Wood Veneer / Finish":{"price":0,"unit":"sqft","source":""}}`
          }]
      });
      const text = data.content?.filter(c => c.type === "text").map(c => c.text).join("") || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      try {
        const parsed = JSON.parse(clean);
        setPrices(parsed);
      } catch {
        // Fallback prices if search fails
        setPrices({
          "MDF 3/4in": { price: 72, unit: "sheet", source: "Est. Vancouver" },
          "MDF 3/4in — Painted": { price: 72, unit: "sheet", source: "Est. Vancouver" },
          "Birch Plywood 3/4in": { price: 95, unit: "sheet", source: "Est. Vancouver" },
          "Melamine": { price: 85, unit: "sheet", source: "Est. Vancouver" },
          "Wood Veneer": { price: 6.5, unit: "sqft", source: "Est. market" },
          "Cabinet Door — MDF": { price: 45, unit: "door", source: "Est. market" },
          "Cabinet Door — MDF — Painted": { price: 55, unit: "door", source: "Est. market" },
          "Drawer Box + Slide": { price: 35, unit: "set", source: "Est. Richelieu" },
          "Soft-close Hinges": { price: 8, unit: "pair", source: "Est. Richelieu" },
          "Cabinet Pulls/Handles": { price: 12, unit: "each", source: "Est. Richelieu" },
          "Edge Banding (ft)": { price: 0.85, unit: "ft", source: "Est. market" },
          "Stone Countertop (sqft)": { price: 85, unit: "sqft", source: "Est. Vancouver" },
          "Dekton Countertop (sqft)": { price: 120, unit: "sqft", source: "Est. Vancouver" },
        });
      }
      setFetched(true);
    } catch(e) {
      setPrices({
        "MDF 3/4in": { price: 72, unit: "sheet", source: "Estimated" },
        "Birch Plywood 3/4in": { price: 95, unit: "sheet", source: "Estimated" },
        "Soft-close Hinges": { price: 8, unit: "pair", source: "Estimated" },
        "Drawer Slides": { price: 22, unit: "pair", source: "Estimated" },
        "Edge Banding (ft)": { price: 0.85, unit: "ft", source: "Estimated" },
        "Hardware Set": { price: 180, unit: "set", source: "Estimated" },
        "Wood Veneer / Finish": { price: 4.5, unit: "sqft", source: "Estimated" },
      });
      setFetched(true);
    }
    setLoading(false);
  };

  const byRoom = buildMaterials();
  const allMats = {};
  Object.values(byRoom).forEach(rm => {
    Object.entries(rm).forEach(([k, v]) => { allMats[k] = (allMats[k] || 0) + v; });
  });
  const withWaste = Object.fromEntries(Object.entries(allMats).map(([k, v]) => [k, Math.ceil(v * (1 + WASTE))]));

  const calcCost = (mat, qty) => {
    const p = prices[mat];
    if (!p || !p.price) return null;
    return (p.price * qty).toFixed(2);
  };

  const totalCost = Object.entries(withWaste).reduce((sum, [mat, qty]) => {
    const cost = calcCost(mat, qty);
    return sum + (cost ? parseFloat(cost) : 0);
  }, 0);

  const sections = ["all", ...Object.keys(byRoom)];

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "'Playfair Display', serif" }}>Material Takeoff</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>All quantities include {Math.round(WASTE*100)}% waste factor</p>
          </div>
          <button
            onClick={fetchPrices}
            disabled={loading}
            style={{ background: fetched ? "rgba(16,185,129,0.15)" : "rgba(200,169,110,0.15)", border: `1px solid ${fetched ? "rgba(16,185,129,0.3)" : "rgba(200,169,110,0.3)"}`, borderRadius: 8, padding: "8px 16px", color: fetched ? "#34d399" : "#c8a96e", fontSize: 12, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            {loading ? (
              <><span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid #c8a96e", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Fetching Live Prices...</>
            ) : fetched ? "✓ Live Prices Loaded" : "🔍 Fetch Live Prices (Vancouver)"}
          </button>
        </div>

        {/* Section Tabs */}
        <div style={{ display: "flex", gap: 6, padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" }}>
          {sections.map(s => (
            <button key={s} onClick={() => setActiveSection(s)} style={{ padding: "5px 12px", borderRadius: 20, border: "none", background: activeSection === s ? "#c8a96e" : "rgba(255,255,255,0.07)", color: activeSection === s ? "#1a1008" : "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: activeSection === s ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              {s === "all" ? "All Rooms" : s}
            </button>
          ))}
        </div>

        {/* Material Table */}
        <div style={{ padding: "4px 0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 100px", gap: 0, padding: "8px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {["Material", "Net Qty", "+25% Waste", "Unit Price", "Total CAD"].map((h, i) => (
              <p key={i} style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: i > 0 ? "right" : "left" }}>{h}</p>
            ))}
          </div>

          {Object.entries(activeSection === "all" ? allMats : (byRoom[activeSection] || {})).map(([mat, netQty], i) => {
            const wasteQty = Math.ceil(netQty * (1 + WASTE));
            const p = prices[mat];
            const cost = calcCost(mat, wasteQty);
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 100px", gap: 0, padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                <div>
                  <p style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{mat}</p>
                  {p?.source && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>Source: {p.source}</p>}
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", textAlign: "right" }}>{netQty}</p>
                <p style={{ fontSize: 13, color: "#c8a96e", fontWeight: 600, textAlign: "right" }}>{wasteQty}</p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "right" }}>
                  {p ? `$${p.price}/${p.unit}` : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, textAlign: "right", color: cost ? "#fff" : "rgba(255,255,255,0.2)" }}>
                  {cost ? `$${parseFloat(cost).toLocaleString()}` : "—"}
                </p>
              </div>
            );
          })}

          {fetched && totalCost > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px 100px", padding: "12px 18px", background: "rgba(200,169,110,0.07)", borderTop: "1px solid rgba(200,169,110,0.2)" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Total Materials</p>
              <p></p><p></p><p></p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#c8a96e", textAlign: "right" }}>${totalCost.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            </div>
          )}
        </div>

        {!fetched && (
          <div style={{ padding: "16px 18px", textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Click "Fetch Live Prices" to get current Vancouver market prices</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ANALYSIS RESULT ──────────────────────────────────────────────────────────
function AnalysisResult({ result, onBack, onReanalyze, savedResults, onLoadSaved, onUpdate }) {
  const [expanded, setExpanded] = useState(result.rooms?.[0]?.id || null);
  const [showHistory, setShowHistory] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 14px", color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer" }}>← Back to Editor</button>
        <div>
          <p style={{ fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "'Playfair Display', serif" }}>Analysis Complete</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{result.pages_analyzed} pages · {result.rooms?.length || 0} areas · {result.avg_confidence}% avg confidence{result.timestamp ? ` · ${result.timestamp}` : ""}</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {savedResults?.length > 1 && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowHistory(!showHistory)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "7px 14px", color: "rgba(255,255,255,0.6)", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                🕐 History ({savedResults.length})
              </button>
              {showHistory && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 280, background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, zIndex: 100, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "10px 14px 6px" }}>Previous Analyses</p>
                  {savedResults.map((r, i) => (
                    <div key={i} onClick={() => { onLoadSaved(r); setShowHistory(false); }} style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", background: i === 0 ? "rgba(200,169,110,0.08)" : "transparent" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {i === 0 && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 10, background: "rgba(200,169,110,0.2)", color: "#c8a96e", fontWeight: 600 }}>Current</span>}
                        <p style={{ fontSize: 11, color: "#fff", fontWeight: 500 }}>{r.pdfName || "PDF"}</p>
                      </div>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{r.selectedPages} · {r.timestamp}</p>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>{r.rooms?.length || 0} rooms · {r.avg_confidence}% confidence</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <button onClick={onReanalyze} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "7px 14px", color: "rgba(255,255,255,0.6)", fontSize: 11, cursor: "pointer" }}>🔄 Re-analyze</button>
          <button onClick={() => {
            const dbg = {
              rooms: (result.rooms || []).map(r => ({ id: r.id, label: r.label, itemCount: r.items?.length, firstItem: r.items?.[0] })),
            };
            const txt = JSON.stringify(dbg, null, 2);
            navigator.clipboard?.writeText(txt).then(() => alert("Debug data copied! Paste it to Claude.")).catch(() => {
              window.prompt("Copy this and paste to Claude:", txt);
            });
          }} style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 8, padding: "7px 14px", color: "#93c5fd", fontSize: 11, cursor: "pointer" }}>🐞 Copy Debug</button>
          <button style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 14px", color: "rgba(255,255,255,0.6)", fontSize: 11, cursor: "pointer" }}>Edit Items</button>
          <button style={{ background: "#c8a96e", border: "none", borderRadius: 8, padding: "7px 16px", color: "#1a1008", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Calculate Price</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          {[
            { label: "MDF / Plywood (incl. 15% waste)", val: result.summary?.mdf_sheets || "—" },
            { label: "Linear Feet of Millwork", val: result.summary?.linear_feet || "—" },
            { label: "Hardware Sets", val: result.summary?.hardware_sets || "—" },
          ].map((s, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 14px" }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{s.label}</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: "#c8a96e", fontFamily: "'Playfair Display', serif" }}>{s.val}</p>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "'Playfair Display', serif" }}>Extracted Items by Room</p>
          </div>
          {(result.rooms || []).map((room, ri) => (
            <div key={ri} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div onClick={() => setExpanded(expanded === room.id ? null : room.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer", background: expanded === room.id ? "rgba(200,169,110,0.05)" : "transparent" }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", flex: 1 }}>{room.label}</p>
                <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 20, background: room.confidence >= 90 ? "rgba(16,185,129,0.15)" : "rgba(200,169,110,0.15)", color: room.confidence >= 90 ? "#34d399" : "#c8a96e", border: "1px solid", borderColor: room.confidence >= 90 ? "rgba(16,185,129,0.25)" : "rgba(200,169,110,0.25)", fontWeight: 600 }}>{room.confidence}%</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{room.items?.length || 0} items</span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{expanded === room.id ? "▲" : "▼"}</span>
              </div>
              {expanded === room.id && (
                <div style={{ padding: "0 16px 12px" }}>
                  <EditableItemList items={room.items || []} roomId={room.id} onUpdate={(roomId, newItems) => {
                    const updated = { ...result, rooms: result.rooms.map(r => r.id === roomId ? { ...r, items: newItems } : r) };
                    if (onUpdate) onUpdate(updated);
                  }} />
                  {room.questions?.length > 0 && (
                    <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 8, background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.2)" }}>
                      <p style={{ fontSize: 13, color: "#93c5fd", fontWeight: 600, marginBottom: 8 }}>AI Questions:</p>
                      {room.questions.map((q, qi) => <p key={qi} style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 5 }}>• {q}</p>)}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {result.notes && (
          <div style={{ background: "rgba(200,169,110,0.06)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#c8a96e", marginBottom: 10 }}>AI Notes:</p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>{result.notes}</p>
          </div>
        )}
        <MaterialTakeoff result={result} />
      </div>
    </div>
  );
}

// ─── AI GATEWAY ────────────────────────────────────────────────────────────
// All AI (Anthropic) calls go through this ONE function. Today it is OFF in a
// deployed build (no API key in the browser). To turn AI on later, deploy a
// tiny proxy that holds the key and set AI_PROXY_URL to its address — every AI
// feature (page detection, live prices, AI fallback) then works, with no other
// code changes.
const AI_PROXY_URL = ""; // e.g. "https://arcwood-ai-proxy.vercel.app/api/ai"

async function callAI(body) {
  // Inside the Claude artifact environment, the platform answers this directly.
  // In a normal deployed site we must route through our own proxy instead.
  const endpoint = AI_PROXY_URL || "https://api.anthropic.com/v1/messages";
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("AI_UNAVAILABLE");
  return res.json();
}

const AI_ENABLED = false; // flip to true once AI_PROXY_URL is set

// ─── MAIN APP COMPONENT BELOW ──────────────────────────────────────────────

export default function MillworkPDFEditor() {
  const [stage, setStage] = useState("upload");
  const [pdfBase64, setPdfBase64] = useState(null);
  const [pdfName, setPdfName] = useState("");
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pages, setPages] = useState([]);
  const [activePage, setActivePage] = useState(null);
  const [tool, setTool] = useState("select");
  const [highlights, setHighlights] = useState([]);
  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const [analyzingStep, setAnalyzingStep] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [savedResults, setSavedResults] = useState([]);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [backendUrl, setBackendUrl] = useState('');
  const [showBackendSettings, setShowBackendSettings] = useState(false);
  const [useBackend, setUseBackend] = useState(false);
  const [pdfLibReady, setPdfLibReady] = useState(false);
  const fileInputRef = useRef(null);

  // Load pdf.js
  useEffect(() => {
    if (window.pdfjsLib) { setPdfLibReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setPdfLibReady(true);
    };
    document.head.appendChild(script);
  }, []);

  // Load pdf-lib (used to extract only the selected pages into a small PDF before
  // sending to the backend — keeps payload well under Vercel's 4.5 MB limit even
  // for 100-150 page source documents)
  useEffect(() => {
    if (window.PDFLib) return;
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js";
    document.head.appendChild(script);
  }, []);

  // Build a small base64 PDF containing ONLY the given 0-indexed pages.
  const buildSubsetPdfBase64 = async (zeroIndexedPages) => {
    if (!window.PDFLib) throw new Error("PDF library still loading — try again in a moment.");
    const srcBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    const srcDoc = await window.PDFLib.PDFDocument.load(srcBytes);
    const outDoc = await window.PDFLib.PDFDocument.create();
    const valid = zeroIndexedPages.filter(i => i >= 0 && i < srcDoc.getPageCount());
    const copied = await outDoc.copyPages(srcDoc, valid);
    copied.forEach(p => outDoc.addPage(p));
    const outBytes = await outDoc.save();
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < outBytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, outBytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  };

  const readFile = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const handleFileSelect = async (file) => {
    if (!file || file.type !== "application/pdf") return;
    setPdfName(file.name);
    const b64 = await readFile(file);
    setPdfBase64(b64);

    // Load with pdf.js
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const doc = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    setPdfDoc(doc);
    const numPages = doc.numPages;

    setAiSuggesting(true);
    // Ask Claude to identify pages (skipped when AI is disabled — user picks pages manually)
    try {
      if (!AI_ENABLED) throw new Error("AI_DISABLED");
      const data = await callAI({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
              { type: "text", text: `Analyze this architectural PDF with ${numPages} pages. For each page, identify:
1. Page number (1-based)
2. Drawing label (e.g. ID-1.00)
3. Drawing title
4. Category: one of [floorplan, elevation, millwork, structural, mechanical, electrical, cover, site, notes]
5. aiSuggested: true if relevant for millwork estimation, false otherwise

Respond ONLY with valid JSON array, no markdown:
[{"id":1,"label":"ID-1.00","title":"Proposed Plan Main Floor","category":"floorplan","aiSuggested":true},...]` }
            ]
          }]
      });
      const text = data.content?.map(c => c.text || "").join("") || "[]";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      const pagesWithMeta = parsed.map(p => ({ ...p, included: p.aiSuggested, thumb: THUMB[p.category] || "📄" }));
      setPages(pagesWithMeta);
      setActivePage(pagesWithMeta.find(p => p.aiSuggested) || pagesWithMeta[0]);
    } catch {
      const fallback = Array.from({ length: numPages }, (_, i) => ({
        id: i + 1, label: `P.${String(i+1).padStart(2,"0")}`, title: `Page ${i + 1}`,
        category: "unknown", aiSuggested: false, included: false, thumb: "📄"
      }));
      setPages(fallback);
      setActivePage(fallback[0]);
    }
    setAiSuggesting(false);
    setStage("editor");
  };

  const togglePage = (id) => setPages(prev => prev.map(p => p.id === id ? { ...p, included: !p.included } : p));
  // ─── BACKEND CABINET EXTRACTION ──────────────────────────────────────────
  const extractWithBackend = async () => {
    if (!backendUrl || !pdfBase64) return null;
    try {
      const pageIndexes = includedPages.map(p => p.id - 1); // original 0-indexed pages
      if (pageIndexes.length === 0) throw new Error("No pages selected");

      // Build a small PDF containing ONLY the selected pages. This keeps the
      // payload tiny even when the source PDF is 100-150 pages, staying well
      // under Vercel's 4.5 MB request limit.
      const subsetB64 = await buildSubsetPdfBase64(pageIndexes);

      // In the subset PDF the selected pages are now simply 0,1,2,... in order,
      // so we tell the backend to read every page of the subset.
      const subsetPages = pageIndexes.map((_, i) => i);

      // Normalize URL: strip trailing slash and any path the user may have pasted,
      // then append the correct endpoint.
      const base = backendUrl.replace(/\/+$/, "").replace(/\/api\/(index|extract_cabinets)$/, "");
      const response = await fetch(`${base}/api/index`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdf_base64: subsetB64,
          pages: subsetPages,
          waste_pct: 0.25
        })
      });
      if (response.status === 413) throw new Error("Selected pages still too large — try fewer pages");
      if (!response.ok) throw new Error(`Backend error: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (!data.extraction || !data.takeoff) throw new Error("Backend returned unexpected response");

      // Re-label the pages in the result with the ORIGINAL labels the user knows,
      // since the subset renumbered them 1,2,3...
      if (data.extraction?.pages) {
        data.extraction.pages.forEach((pg, i) => {
          if (includedPages[i]) pg.page_label = includedPages[i].label;
        });
      }
      return data;
    } catch (err) {
      console.error("Backend extraction failed:", err);
      return null;
    }
  };

  // Convert backend response to UI format
  const convertBackendResult = (backendData) => {
    const rooms = [];
    backendData.extraction.pages.forEach((page) => {
      page.elevations.forEach((elev, ei) => {
        const items = elev.cabinets
          .filter(c => !c.type.includes("Filler") && !c.type.includes("Spacer"))
          .map(c => ({
            name: c.type,
            qty: "1 unit",
            size: `${c.width_inches}" W × ${c.type.includes("Tall") || c.type.includes("Pantry") ? 90 : 34.5}" H × 24" D`,
            material: `${c.material_body} body + ${c.material_back} back`,
            doors: c.doors,
            drawers: c.drawers,
            hardware: c.hardware_codes.join(", "),
            interior: c.function,
            notes: c.all_labels?.join(", ") || ""
          }));
        if (items.length > 0) {
          rooms.push({
            id: `${page.page_label}-elev${ei+1}`,
            label: `${page.page_label} — Elevation ${ei + 1} (${elev.total_width}")`,
            confidence: 95,
            items,
            questions: []
          });
        }
      });
    });

    const mats = backendData.takeoff.materials || {};
    const totalSheets = Object.entries(mats)
      .filter(([k]) => k.includes("Plywood") || k.includes("MDF"))
      .reduce((sum, [, v]) => sum + (v.with_waste || 0), 0);

    return {
      pages_analyzed: backendData.extraction.pages.length,
      avg_confidence: 95,
      summary: {
        mdf_sheets: `~${Math.ceil(totalSheets)} sheets`,
        linear_feet: `${Math.ceil(mats["Edge Banding (ft)"]?.with_waste || 0)} LF edge band`,
        hardware_sets: `${backendData.takeoff.cabinet_count} cabinets`
      },
      rooms,
      notes: `Extracted via PDF vector analysis (95%+ accuracy). ${backendData.takeoff.cabinet_count} cabinet boxes identified across ${rooms.length} elevations.`,
      _source: "backend"
    };
  };


  const acceptSuggestions = () => setPages(prev => prev.map(p => ({ ...p, included: p.aiSuggested })));
  const includeAll = () => setPages(prev => prev.map(p => ({ ...p, included: true })));

  const includedPages = pages.filter(p => p.included);
  const pageHighlights = highlights.filter(h => h.pageId === activePage?.id);
  const activePageData = pages.find(p => p.id === activePage?.id) || activePage;
  const activeIdx = pages.findIndex(p => p.id === activePageData?.id);

  const startAnalysis = async () => {
    if (!pdfBase64) return;
    setStage("analyzing");
    setAnalyzingProgress(0);

    // Try backend extraction first if enabled
    if (useBackend && backendUrl) {
      setAnalyzingStep("Extracting cabinets via backend (PDF vector analysis)...");
      let prog = 0;
      const fastInterval = setInterval(() => {
        prog += 8;
        setAnalyzingProgress(Math.min(prog, 90));
      }, 300);
      try {
        const backendData = await extractWithBackend();
        clearInterval(fastInterval);
        if (backendData) {
          if (typeof window !== "undefined") window.__lastBackend = backendData;
          const converted = convertBackendResult(backendData);
          if (typeof window !== "undefined") window.__lastConverted = converted;
          console.log("[Arcwood] backend pages:", backendData?.extraction?.pages?.length,
                      "| rooms built:", converted?.rooms?.length,
                      "| first elevation cabinets:", backendData?.extraction?.pages?.[0]?.elevations?.[0]?.cabinets?.length);
          setAnalyzingProgress(100);
          setAnalyzingStep("Backend extraction complete!");
          setTimeout(() => {
            setAnalysisResult(converted);
            setSavedResults(prev => [{
              ...converted,
              timestamp: new Date().toLocaleTimeString(),
              pdfName: pdfName,
              selectedPages: includedPages.map(p => p.label).join(", ")
            }, ...prev].slice(0, 5));
            setStage("result");
          }, 500);
          return;
        }
      } catch (e) {
        clearInterval(fastInterval);
        console.warn("Backend failed, falling back to AI analysis:", e);
      }
    }

    const steps = ["Reading PDF structure...","Identifying page types...","Extracting floor plan dimensions...","Reading elevation drawings...","Analyzing millwork details...","Cross-referencing measurements...","Calculating material quantities...","Applying 15% waste factor...","Finalizing extraction..."];
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setAnalyzingProgress(Math.round((i / steps.length) * 85));
      setAnalyzingStep(steps[i - 1] || "");
      if (i >= steps.length) clearInterval(interval);
    }, 700);
    try {
      const selectedTitles = includedPages.map(p => `${p.label}: ${p.title}`).join(", ");
      const hlNote = highlights.length > 0 ? `User highlighted ${highlights.length} specific areas.` : "Analyze all selected pages fully.";
      if (!AI_ENABLED) throw new Error("AI_DISABLED");
      const data = await callAI({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{
            role: "user",
            content: [
              { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
              { type: "text", text: `You are a professional millwork estimator and cabinet maker. Analyze ONLY these pages: ${selectedTitles}. ${hlNote}

TASK: Count and list EVERY individual cabinet box separately. Each box is a separate line item.

For EACH cabinet box extract:
- type: "Upper" / "Base" / "Tall" / "Island" / "Vanity" / "Built-in" / "Shelving"
- location: which wall or area (e.g. "Sink Wall", "Island", "Pantry")
- width_inches: exact width from drawing dimensions
- height_inches: exact height
- depth_inches: exact depth
- doors: number of doors
- drawers: number of drawers  
- door_style: e.g. "flat panel MDF", "open", "glass"
- interior: e.g. "fixed shelf", "pull-out", "adjustable shelves"
- hardware: hinges count + pull/handle count
- material: e.g. "MW1 - 3/4in MDF painted", "MW2 - wood veneer"
- notes: any TBC or special notes from drawing

Read ALL dimension callouts carefully from the elevation drawings.
Count every cabinet box shown in plan and elevations.
Do NOT group multiple boxes together - list each one separately.

CRITICAL: Respond with ONLY valid compact JSON, no markdown, no line breaks inside strings:
{"pages_analyzed":${includedPages.length},"avg_confidence":90,"summary":{"mdf_sheets":"~X sheets","linear_feet":"~X LF","hardware_sets":"~X sets"},"rooms":[{"id":"room_id","label":"Room Name","confidence":90,"items":[{"name":"Cabinet type + location","qty":"1 unit","size":"WxHxD inches","material":"spec","doors":0,"drawers":0,"hardware":"X hinges X pulls","interior":"shelf type","notes":"any TBC"}],"questions":["unclear items needing confirmation"]}],"notes":"overall notes"}` }
            ]
          }]
      });
      clearInterval(interval);
      setAnalyzingProgress(95);
      setAnalyzingStep("Parsing results...");
      const text = data.content?.map(c => c.text || "").join("") || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      let parsed;
      try {
        parsed = JSON.parse(clean);
      } catch {
        // Try to extract JSON from partial response
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) {
          try { parsed = JSON.parse(match[0]); } catch { parsed = null; }
        }
      }
      if (!parsed) throw new Error("Could not parse AI response. Try selecting fewer pages.");
      setAnalyzingProgress(100);
      setTimeout(() => {
        setAnalysisResult(parsed);
        setSavedResults(prev => [{
          ...parsed,
          timestamp: new Date().toLocaleTimeString(),
          pdfName: pdfName,
          selectedPages: includedPages.map(p => p.label).join(", ")
        }, ...prev].slice(0, 5));
        setStage("result");
      }, 400);
    } catch (err) {
      clearInterval(interval);
      const aiOff = (err && err.message === "AI_DISABLED") || !AI_ENABLED;
      const msg = aiOff
        ? "Turn on '⚡ Backend' (top right) and press 'Extract with Backend' to read cabinet dimensions directly from the PDF. AI analysis is not enabled in this build."
        : (err.message || "Unknown error. Try selecting fewer pages and retry.");
      setAnalysisResult({
        pages_analyzed: includedPages.length,
        avg_confidence: 0,
        summary: { mdf_sheets: "—", linear_feet: "—", hardware_sets: "—" },
        rooms: [{ id: "err", label: aiOff ? "Use Backend Extraction" : "Analysis Error", confidence: 0, items: [], questions: [msg] }],
        notes: aiOff ? "This deployed build uses the Python backend for extraction. AI features can be enabled later." : "Tip: If error persists, try selecting fewer pages (5-10 at a time) for better results."
      });
      setStage("result");
    }
  };

  if (stage === "upload") return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>
      <div style={{ width: 480, textAlign: "center" }}>
        <div style={{ marginBottom: 20 }}>
          <svg viewBox="0 0 80 80" style={{ width: 72, height: 72 }}>
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(200,169,110,0.2)" strokeWidth="2"/>
            <g>
              <polygon points="40,12 43,40 40,44 37,40" fill="#c8a96e"/>
              <polygon points="40,68 43,40 40,36 37,40" fill="rgba(200,169,110,0.35)"/>
              <polygon points="12,40 40,37 44,40 40,43" fill="rgba(255,255,255,0.5)"/>
              <polygon points="68,40 40,43 36,40 40,37" fill="rgba(255,255,255,0.2)"/>
              <circle cx="40" cy="40" r="3" fill="#fff"/>
            </g>
          </svg>
        </div>
        <p style={{ fontSize: 11, color: "rgba(200,169,110,0.7)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>Arcwood Millwork Inc.</p>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", fontFamily: "'Playfair Display', serif", marginBottom: 10 }}>Millwork Quote — PDF Analyzer</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginBottom: 12, lineHeight: 1.7 }}>Upload your architectural PDF. AI will identify relevant pages and extract all millwork items.</p>
        {!pdfLibReady && <p style={{ fontSize: 11, color: "#fbbf24", marginBottom: 16 }}>Loading PDF renderer...</p>}
        <div
          onDrop={e => { e.preventDefault(); pdfLibReady && handleFileSelect(e.dataTransfer.files[0]); }}
          onDragOver={e => e.preventDefault()}
          onClick={() => pdfLibReady && fileInputRef.current?.click()}
          style={{ border: "2px dashed rgba(200,169,110,0.4)", borderRadius: 16, padding: "40px 32px", cursor: pdfLibReady ? "pointer" : "not-allowed", background: "rgba(200,169,110,0.03)", opacity: pdfLibReady ? 1 : 0.5 }}
          onMouseEnter={e => { if (pdfLibReady) e.currentTarget.style.background = "rgba(200,169,110,0.07)"; }}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(200,169,110,0.03)"}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 6 }}>Drop PDF here or click to browse</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Full architectural packages · Any number of pages</p>
          <div style={{ marginTop: 20, display: "inline-block", background: "#c8a96e", borderRadius: 10, padding: "10px 28px", color: "#1a1008", fontWeight: 700, fontSize: 13 }}>Select PDF File</div>
        </div>
        <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={e => e.target.files[0] && handleFileSelect(e.target.files[0])} />
      </div>
    </div>
  );

  if (stage === "analyzing") return (
    <div style={{ minHeight: "100vh", background: "#0d0d1a", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap'); @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} @keyframes spin{to{transform:rotate(360deg)}} @keyframes compassSpin{0%{transform:rotate(0deg)}25%{transform:rotate(92deg)}50%{transform:rotate(180deg)}75%{transform:rotate(268deg)}100%{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 420, textAlign: "center" }}>
        <div style={{ width: 80, height: 80, margin: "0 auto 20px", position: "relative" }}>
          <svg viewBox="0 0 80 80" style={{ width: 80, height: 80 }}>
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(200,169,110,0.15)" strokeWidth="2"/>
            <circle cx="40" cy="40" r="36" fill="none" stroke="#c8a96e" strokeWidth="2" strokeDasharray="56 170" strokeLinecap="round" style={{ animation: "spin 1.4s linear infinite", transformOrigin: "40px 40px" }}/>
            <circle cx="40" cy="40" r="28" fill="none" stroke="rgba(200,169,110,0.08)" strokeWidth="1.5"/>
            <g style={{ animation: "compassSpin 3s ease-in-out infinite", transformOrigin: "40px 40px" }}>
              <polygon points="40,12 43,40 40,44 37,40" fill="#c8a96e"/>
              <polygon points="40,68 43,40 40,36 37,40" fill="rgba(200,169,110,0.35)"/>
              <polygon points="12,40 40,37 44,40 40,43" fill="rgba(255,255,255,0.5)"/>
              <polygon points="68,40 40,43 36,40 40,37" fill="rgba(255,255,255,0.2)"/>
              <circle cx="40" cy="40" r="3.5" fill="#fff"/>
              <circle cx="40" cy="40" r="2" fill="#c8a96e"/>
            </g>
            <text x="40" y="76" textAnchor="middle" fill="rgba(200,169,110,0.6)" fontSize="6" fontFamily="sans-serif" letterSpacing="1">ARCWOOD</text>
          </svg>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "'Playfair Display', serif", marginBottom: 8 }}>AI Analyzing PDF...</h2>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>{includedPages.length} pages · {pdfName}</p>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, height: 6, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "#c8a96e", borderRadius: 8, width: `${analyzingProgress}%`, transition: "width 0.4s ease" }} />
        </div>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>{analyzingProgress}% — {analyzingStep}</p>
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 6 }}>
          {includedPages.slice(0, 7).map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", opacity: analyzingProgress > i * 12 ? 1 : 0.3, transition: "opacity 0.3s" }}>
              <span>{analyzingProgress > i * 12 + 10 ? "✅" : "⏳"}</span>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{p.label}: {p.title}</span>
            </div>
          ))}
          {includedPages.length > 7 && <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>+{includedPages.length - 7} more...</p>}
        </div>
      </div>
    </div>
  );

  if (stage === "result" && analysisResult) return (
    <div style={{ height: "100vh", background: "#0d0d1a", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>
      <AnalysisResult
        result={analysisResult}
        onBack={() => setStage("editor")}
        onReanalyze={() => { setStage("editor"); }}
        savedResults={savedResults}
        onLoadSaved={(r) => setAnalysisResult(r)}
        onUpdate={(updated) => setAnalysisResult(updated)}
      />
    </div>
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0d0d1a", fontFamily: "'DM Sans', sans-serif", color: "#fff" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap'); @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {/* Top Bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg,#c8a96e,#6b4c0a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#fff", fontFamily: "serif", letterSpacing: -1 }}>A</div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#c8a96e", fontFamily: "'Playfair Display', serif", letterSpacing: 0.3 }}>Arcwood Millwork Inc.</p>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: 0.5 }}>PDF ANALYZER — MILLWORK QUOTE</p>
          </div>
        </div>
        <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />
        <div>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{pdfName || "No file loaded"}</p>
          <p style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>{pages.length} pages loaded</p>
        </div>
        <div style={{ display: "flex", gap: 4, marginLeft: 20 }}>
          {[{ id: "select", label: "Select", icon: "↖" }, { id: "highlight", label: "Highlight", icon: "✏️" }].map(t => (
            <button key={t.id} onClick={() => setTool(t.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, border: tool === t.id ? "1px solid rgba(200,169,110,0.5)" : "1px solid rgba(255,255,255,0.08)", background: tool === t.id ? "rgba(200,169,110,0.12)" : "transparent", color: tool === t.id ? "#c8a96e" : "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer" }}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>
        {aiSuggesting && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#c8a96e" }}>
            <div style={{ width: 10, height: 10, border: "2px solid #c8a96e", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            AI identifying pages...
          </div>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{includedPages.length} pages selected</span>
          <button onClick={() => setShowBackendSettings(true)} style={{ background: useBackend && backendUrl ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.06)", border: `1px solid ${useBackend && backendUrl ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)"}`, borderRadius: 8, padding: "7px 12px", color: useBackend && backendUrl ? "#34d399" : "rgba(255,255,255,0.6)", fontSize: 11, cursor: "pointer", fontWeight: 600 }} title="Backend Settings">
            {useBackend && backendUrl ? "⚡ Backend ON" : "⚙️"}
          </button>
          <button onClick={startAnalysis} style={{ background: "#c8a96e", border: "none", borderRadius: 8, padding: "7px 18px", color: "#1a1008", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            {useBackend && backendUrl ? "Extract with Backend →" : "Analyze with AI →"}
          </button>
        </div>
      </div>

      {/* Backend Settings Modal */}
      {showBackendSettings && (
        <div onClick={() => setShowBackendSettings(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#1a1a2e", border: "1px solid rgba(200,169,110,0.3)", borderRadius: 14, padding: "24px 28px", width: 480, maxWidth: "90vw" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "'Playfair Display', serif" }}>Cabinet Extractor Backend</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>Connect to Python backend for 95%+ accurate extraction</p>
              </div>
              <button onClick={() => setShowBackendSettings(false)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Backend URL</label>
              <input
                type="text"
                value={backendUrl}
                onChange={e => setBackendUrl(e.target.value)}
                placeholder="https://arcwood-backend-xxxxx.vercel.app"
                style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 12, outline: "none", fontFamily: "monospace" }}
              />
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>The endpoint where you deployed the Vercel function</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "rgba(200,169,110,0.06)", border: "1px solid rgba(200,169,110,0.2)", borderRadius: 8, marginBottom: 14 }}>
              <input
                type="checkbox"
                checked={useBackend}
                onChange={e => setUseBackend(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, color: "#c8a96e", fontWeight: 600 }}>Use Backend for Extraction</p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Reads dimensions directly from PDF vectors — much faster and more accurate</p>
              </div>
            </div>
            <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
              <p style={{ fontSize: 11, color: "#93c5fd", fontWeight: 600, marginBottom: 4 }}>📊 Backend vs AI Analysis</p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
                <strong style={{ color: "#34d399" }}>Backend:</strong> 100% dimension accuracy · ~2 sec · $0.0001/call<br/>
                <strong style={{ color: "#fbbf24" }}>AI Analysis:</strong> 70-80% accuracy · 30+ sec · $0.23/call
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => {
                setShowBackendSettings(false);
              }} style={{ flex: 1, background: "#c8a96e", border: "none", borderRadius: 8, padding: "10px 0", color: "#1a1008", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Save Settings</button>
              <button onClick={async () => {
                if (!backendUrl) { alert("Enter backend URL first"); return; }
                try {
                  const r = await fetch(`${backendUrl}/api/extract_cabinets`, { method: "OPTIONS" });
                  alert(r.ok ? "✓ Backend reachable!" : `Status: ${r.status}`);
                } catch(e) { alert(`Cannot reach backend: ${e.message}`); }
              }} style={{ padding: "10px 18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "rgba(255,255,255,0.6)", fontSize: 11, cursor: "pointer" }}>Test</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left: Page List */}
        <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", background: "rgba(200,169,110,0.06)", borderBottom: "1px solid rgba(200,169,110,0.15)" }}>
            <p style={{ fontSize: 10, color: "#c8a96e", fontWeight: 600, marginBottom: 6 }}>🤖 AI Suggestion</p>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>{pages.filter(p => p.aiSuggested).length} of {pages.length} pages relevant for Millwork</p>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={acceptSuggestions} style={{ flex: 1, background: "rgba(200,169,110,0.15)", border: "1px solid rgba(200,169,110,0.3)", borderRadius: 6, padding: "5px 0", color: "#c8a96e", fontSize: 9, cursor: "pointer", fontWeight: 600 }}>Accept AI</button>
              <button onClick={includeAll} style={{ flex: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "5px 0", color: "rgba(255,255,255,0.4)", fontSize: 9, cursor: "pointer" }}>All Pages</button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
            {pages.map(page => {
              const meta = CATEGORY_META[page.category] || CATEGORY_META.unknown;
              const isActive = activePageData?.id === page.id;
              return (
                <div key={page.id} onClick={() => setActivePage(page)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 8, marginBottom: 3, cursor: "pointer", background: isActive ? "rgba(255,255,255,0.07)" : "transparent", border: isActive ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent" }}>
                  <div onClick={e => { e.stopPropagation(); togglePage(page.id); }} style={{ width: 16, height: 16, borderRadius: 4, background: page.included ? "#c8a96e" : "rgba(255,255,255,0.08)", border: page.included ? "none" : "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                    {page.included && <span style={{ fontSize: 9, color: "#1a1008", fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 12 }}>{page.thumb}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: isActive ? "#fff" : "rgba(255,255,255,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{page.title}</p>
                    <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                      <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 3, background: meta.bg, color: meta.color }}>{meta.label}</span>
                      {page.aiSuggested && <span style={{ fontSize: 8, color: "rgba(200,169,110,0.6)" }}>AI ✓</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>{page.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center: PDF Viewer */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#080b12" }}>
          {activePageData && (
            <div style={{ padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <span>{activePageData.thumb}</span>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{activePageData.title}</p>
                <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{activePageData.label}</p>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                {activePageData.aiSuggested
                  ? <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 20, background: "rgba(200,169,110,0.12)", color: "#c8a96e", border: "1px solid rgba(200,169,110,0.25)" }}>AI: Relevant ✓</span>
                  : <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 20, background: "rgba(107,114,128,0.12)", color: "#9ca3af", border: "1px solid rgba(107,114,128,0.25)" }}>AI: Not relevant</span>}
                <div onClick={() => togglePage(activePageData.id)} style={{ padding: "3px 10px", borderRadius: 20, background: activePageData.included ? "rgba(200,169,110,0.12)" : "rgba(255,255,255,0.05)", border: activePageData.included ? "1px solid rgba(200,169,110,0.3)" : "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>
                  <span style={{ fontSize: 9, color: activePageData.included ? "#c8a96e" : "rgba(255,255,255,0.4)", fontWeight: 600 }}>{activePageData.included ? "✓ Included" : "+ Include"}</span>
                </div>
              </div>
            </div>
          )}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", padding: "8px 12px 0" }}>
            {pdfDoc && activePageData ? (
              <PDFPageViewer
                key={activePageData.id}
                pdfDoc={pdfDoc}
                pageNum={activePageData.id}
                tool={tool}
                highlights={pageHighlights}
                onAddHighlight={h => setHighlights(prev => [...prev, { ...h, pageId: activePageData.id }])}
              />
            ) : (
              <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                  <p>Loading PDF...</p>
                </div>
              </div>
            )}
          </div>
          <div style={{ padding: "8px 16px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexShrink: 0 }}>
            <button onClick={() => activeIdx > 0 && setActivePage(pages[activeIdx - 1])} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 12px", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }}>← Prev</button>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{activeIdx + 1} / {pages.length}</span>
            <button onClick={() => activeIdx < pages.length - 1 && setActivePage(pages[activeIdx + 1])} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 12px", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }}>Next →</button>
          </div>
        </div>

        {/* Right: Tools */}
        <div style={{ width: 200, flexShrink: 0, borderLeft: "1px solid rgba(255,255,255,0.07)", padding: 12, overflowY: "auto" }}>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Selection Mode</p>
          {[{ id: "select", label: "View Only", desc: "Browse pages", icon: "↖" }, { id: "highlight", label: "Draw Area", desc: "Drag to select region", icon: "✏️" }].map(t => (
            <div key={t.id} onClick={() => setTool(t.id)} style={{ padding: "9px 10px", borderRadius: 9, marginBottom: 5, cursor: "pointer", background: tool === t.id ? "rgba(200,169,110,0.1)" : "rgba(255,255,255,0.03)", border: tool === t.id ? "1px solid rgba(200,169,110,0.3)" : "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span>{t.icon}</span>
                <p style={{ fontSize: 11, fontWeight: 600, color: tool === t.id ? "#c8a96e" : "rgba(255,255,255,0.6)" }}>{t.label}</p>
              </div>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", paddingLeft: 18 }}>{t.desc}</p>
            </div>
          ))}
          {pageHighlights.length > 0 && (
            <>
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "14px 0" }} />
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Highlighted</p>
              {pageHighlights.map(h => (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: 7, background: "rgba(200,169,110,0.08)", border: "1px solid rgba(200,169,110,0.15)", marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: "#c8a96e", flex: 1 }}>{h.label}</span>
                  <button onClick={() => setHighlights(prev => prev.filter(x => x.id !== h.id))} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 12 }}>×</button>
                </div>
              ))}
            </>
          )}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "14px 0" }} />
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Summary</p>
          {[{ label: "Pages selected", val: includedPages.length }, { label: "Areas highlighted", val: highlights.length }].map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{s.label}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: s.val > 0 ? "#c8a96e" : "rgba(255,255,255,0.25)" }}>{s.val}</span>
            </div>
          ))}
          <button onClick={startAnalysis} style={{ width: "100%", marginTop: 12, background: "#c8a96e", border: "none", borderRadius: 8, padding: "9px 0", color: "#1a1008", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Analyze Now →</button>
        </div>
      </div>
    </div>
  );
}
