import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { Plus, Trash2, Heart, MapPin, X } from 'lucide-react';
import './App.css';

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyC-7EiFo4Je8dkZ9DS1tpCTO7jQ0enU5Ag",
  authDomain: "minhalady.firebaseapp.com",
  projectId: "minhalady",
  storageBucket: "minhalady.firebasestorage.app",
  messagingSenderId: "729588093361",
  appId: "1:729588093361:web:d0aafceac3eb98b131ed90"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- COMPONENTE: CARD HOLOGRÁFICO (REMODELADO PARA RESSURREIÇÃO) ---
const CardHolografico = ({ item, onDelete, onSelect, isActive, isExpanded, onClose }) => {
  const cardRef = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const handleMove = (clientX, clientY) => {
    if (isExpanded) return; // Desativa inclinação quando expandido
    const rect = cardRef.current.getBoundingClientRect();
    const x = (clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const y = (clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    setCoords({ x, y });
  };

  const resetCoords = () => setCoords({ x: 0, y: 0 });

  return (
    <div
      className={`card-mercy ${isActive ? 'card-glow-active' : ''} ${isExpanded ? 'is-expanded' : ''}`}
      ref={cardRef}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseLeave={resetCoords}
      onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={resetCoords}
      onClick={() => !isExpanded && onSelect(item)}
      style={{
        transform: isExpanded 
          ? 'translate(-50%, -50%) scale(1.1)' 
          : `perspective(1000px) rotateY(${coords.x * 15}deg) rotateX(${-coords.y * 15}deg)`,
        '--ratio-x': coords.x,
        '--ratio-y': coords.y,
        touchAction: 'none',
        cursor: isExpanded ? 'default' : 'pointer'
      }}
    >
      {isExpanded && (
        <X 
          size={24} 
          onClick={(e) => { e.stopPropagation(); onClose(); }} 
          style={{ position: 'absolute', top: 15, right: 15, cursor: 'pointer', zIndex: 10, color: '#F0B323' }} 
        />
      )}

      <div className="holo-bg" />
      <div className="circles-overlay" />
      
      <div className="card-content">
        <img src={item.assinatura} className="sig-img" alt="Assinatura" style={{ height: isExpanded ? '180px' : '120px' }} />
        <p className="msg-text" style={{ fontSize: isExpanded ? '1.1rem' : '0.85rem' }}>"{item.mensagem}"</p>
        
        {/* INFO EXTRA QUE APARECE NA RESSURREIÇÃO */}
        {isExpanded && (
          <div className="extra-info">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', color: '#888', fontSize: '0.8rem' }}>
                <MapPin size={14} style={{ marginRight: '5px' }} />
                Local: {item.local}
              </div>
              {item.local !== "Não informada" && item.local !== "Não permitida" && (
                <a 
                  href={`https://www.google.com/maps?q=${item.local}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.mapsBtn}
                >
                  maps 📍
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', zIndex: 3 }}>
        <strong style={{ color: '#F0B323', fontSize: '0.9rem' }}>{item.convidado}</strong>
        {localStorage.getItem(`owner_${item.id}`) === item.token && !isExpanded && (
          <Trash2 size={18} color="#ff4b5c" onClick={(e) => { e.stopPropagation(); onDelete(e, item.id, item.token); }} />
        )}
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
function App() {
  const [assinaturas, setAssinaturas] = useState([]);
  const [modalAberta, setModalAberta] = useState(false);
  const [detalheSeleccionado, setDetalheSeleccionado] = useState(null);
  const [memeAberto, setMemeAberto] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [nome, setNome] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [userLocation, setUserLocation] = useState("Não informada");
  const [memeCoords, setMemeCoords] = useState({ x: 0, y: 0 });
  const sigCanvas = useRef({});

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`),
        () => setUserLocation("Não permitida")
      );
    }
  }, []);

  useEffect(() => {
    if (assinaturas.length === 0) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % assinaturas.length);
    }, 1500);
    return () => clearInterval(interval);
  }, [assinaturas]);

  useEffect(() => {
    const q = query(collection(db, "assinaturas"), orderBy("data", "desc"));
    return onSnapshot(q, (snapshot) => {
      setAssinaturas(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const handleMemeMove = (clientX, clientY) => {
    const x = (clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    const y = (clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    setMemeCoords({ x, y });
  };

  const salvar = async () => {
    if (sigCanvas.current.isEmpty() || !nome || !mensagem) return alert("Heróis preenchem tudo! ✨");
    const senha = prompt("Digite a Chave de Acesso:");
    if (senha !== "amaioral") return alert("Acesso negado! ❌");

    try {
      const imagem = sigCanvas.current.getCanvas().toDataURL('image/png');
      const meuToken = Math.random().toString(36).substring(7);

      const docRef = await addDoc(collection(db, "assinaturas"), {
        convidado: nome, mensagem, assinatura: imagem, data: new Date(), token: meuToken, local: userLocation
      });

      localStorage.setItem(`owner_${docRef.id}`, meuToken);
      setNome(""); setMensagem(""); setModalAberta(false);
    } catch (e) { alert("Erro ao conectar ao Firebase!"); }
  };

  const apagar = async (e, id, tokenRemoto) => {
    if (localStorage.getItem(`owner_${id}`) === tokenRemoto) {
      if (window.confirm("Deseja remover sua marca do mural?")) {
        await deleteDoc(doc(db, "assinaturas", id));
      }
    }
  };

  return (
    <div className="app-container" style={styles.appBody}>
      
      {/* Elementos da Ressurreição */}
      <div 
      className={`resurrection-overlay ${detalheSeleccionado ? 'active' : ''}`} 
      onClick={() => setDetalheSeleccionado(null)} 
    />
    
    <div className={`mercy-container ${detalheSeleccionado ? 'active' : ''}`}>
      <div className="mercy-glow-bg" />
      <img src="/mercy.png" className="mercy-summon" alt="Mercy Resurrection" />
    </div>

    <div onClick={() => setMemeAberto(true)} style={styles.memeButton}>
        <img src="/lady.png" alt="Meme" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

      <header style={{ textAlign: 'center', marginBottom: '50px' }}>
        <Heart fill="#F0B323" color="#F0B323" size={40} />
        <h1 style={styles.mainTitle}>MURAL DA MAIORAL</h1>
        <p style={{ color: '#888' }}>Feliz "Calma amiga, ninguém está vendo! ✨"</p>
      </header>

      <div style={styles.grid}>
        {assinaturas.map((item, index) => (
          <CardHolografico
            key={item.id}
            item={item}
            onDelete={apagar}
            onSelect={setDetalheSeleccionado}
            onClose={() => setDetalheSeleccionado(null)}
            isActive={index === activeIndex}
            isExpanded={detalheSeleccionado?.id === item.id}
          />
        ))}
      </div>

      <button style={styles.fab} onClick={() => setModalAberta(true)}><Plus size={35} color="white" /></button>

      {/* MODAL: CADASTRO */}
      {modalAberta && (
        <div style={styles.overlay}>
          <div style={styles.modalContent}>
            <h2 style={{ color: '#F0B323', marginTop: 0 }}>Nova Assinatura</h2>
            <input className="modal-input-field" placeholder="Seu Nome" value={nome} onChange={e => setNome(e.target.value)} />
            <textarea className="modal-input-field" style={{ height: '80px', resize: 'none' }} placeholder="Mensagem..." value={mensagem} onChange={e => setMensagem(e.target.value)} maxLength={100} />
            <div className="canvas-wrapper">
              <SignatureCanvas ref={sigCanvas} penColor='#F0B323' backgroundColor='#ffffff' canvasProps={{ width: 300, height: 150, className: 'sigCanvas', style: { maxWidth: '100%' } }} />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setModalAberta(false)} style={styles.btnSec}>Sair</button>
              <button onClick={salvar} style={styles.btnPri}>Enviar ✨</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MEME */}
      {memeAberto && (
        <div style={styles.overlay} 
             onClick={() => setMemeAberto(false)} 
             onMouseMove={(e) => handleMemeMove(e.clientX, e.clientY)}
             onTouchMove={(e) => handleMemeMove(e.touches[0].clientX, e.touches[0].clientY)}
             onTouchEnd={() => setMemeCoords({ x: 0, y: 0 })}>
          <div style={{ ...styles.memeCard, transform: `perspective(1000px) rotateY(${memeCoords.x * 25}deg) rotateX(${-memeCoords.y * 25}deg)`, touchAction: 'none' }}>
            <div className="holo-bg" style={{ opacity: 0.7 }} />
            <img src="/lady.png" alt="Meme" style={{ width: '100%', borderRadius: '15px' }} />
            <h3 style={{ color: '#F0B323', margin: '15px 0 5px 0' }}>Chama de senhora! 😎</h3>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  appBody: { minHeight: '100vh', padding: '40px 20px', background: 'radial-gradient(circle, #ffffff, #fff9ea)' },
  mainTitle: { color: '#F0B323', letterSpacing: '4px', fontSize: '2.2rem', margin: '10px 0', textAlign: 'center' },
  grid: { display: 'flex', flexWrap: 'wrap', gap: '30px', justifyContent: 'center' },
  fab: { position: 'fixed', bottom: '30px', right: '30px', width: '65px', height: '65px', borderRadius: '50%', backgroundColor: '#F0B323', border: 'none', cursor: 'pointer', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 10px 20px rgba(240,179,35,0.4)' },
  memeButton: { position: 'fixed', bottom: '30px', left: '30px', width: '60px', height: '60px', borderRadius: '50%', border: '3px solid #F0B323', overflow: 'hidden', cursor: 'pointer', zIndex: 90, backgroundColor: '#fff' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modalContent: { background: 'white', padding: '30px', borderRadius: '25px', width: '95%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  btnPri: { flex: 2, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#F0B323', color: 'white', fontWeight: 'bold', cursor: 'pointer' },
  btnSec: { flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #eee', backgroundColor: '#fff', cursor: 'pointer' },
  mapsBtn: { backgroundColor: '#f8f8f8', color: '#F0B323', padding: '5px 10px', borderRadius: '8px', fontSize: '0.75rem', textDecoration: 'none', border: '1px solid #eee', fontWeight: 'bold' },
  memeCard: { background: 'white', padding: '25px', borderRadius: '30px', textAlign: 'center', maxWidth: '350px', border: '5px solid #F0B323', position: 'relative', overflow: 'hidden', transition: 'transform 0.1s ease-out' }
};

export default App;