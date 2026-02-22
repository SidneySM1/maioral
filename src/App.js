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

// --- COMPONENTE: CARD HOLOGRÁFICO ---
const CardHolografico = ({ item, onDelete, onSelect, isActive }) => {
  const cardRef = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    setCoords({ x, y });
  };

  return (
    <div 
      className={`card-mercy ${isActive ? 'card-glow-active' : ''}`}
      ref={cardRef} 
      onMouseMove={handleMouseMove} 
      onMouseLeave={() => setCoords({ x: 0, y: 0 })}
      onClick={() => onSelect(item)}
      style={{
        transform: `perspective(1000px) rotateY(${coords.x * 15}deg) rotateX(${-coords.y * 15}deg)`,
        '--ratio-x': coords.x,
        '--ratio-y': coords.y,
        cursor: 'pointer'
      }}
    >
      <div className="holo-bg" />
      <div className="circles-overlay" />
      <div className="card-content">
        <img src={item.assinatura} className="sig-img" alt="Assinatura" />
        <p className="msg-text">"{item.mensagem}"</p>
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', zIndex: 3}}>
        <strong style={{color: '#F0B323', fontSize: '0.9rem'}}>{item.convidado}</strong>
        {localStorage.getItem(`owner_${item.id}`) === item.token && (
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

  // 1. Pedir permissão de localização ASSIM QUE ENTRAR
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        },
        () => {
          setUserLocation("Não permitida");
        }
      );
    }
  }, []);

  // 2. Brilho Sequencial
  useEffect(() => {
    if (assinaturas.length === 0) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % assinaturas.length);
    }, 1000);
    return () => clearInterval(interval);
  }, [assinaturas]);

  // 3. Firebase Realtime
  useEffect(() => {
    const q = query(collection(db, "assinaturas"), orderBy("data", "desc"));
    return onSnapshot(q, (snapshot) => {
      setAssinaturas(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const salvar = async () => {
    if (sigCanvas.current.isEmpty() || !nome || !mensagem) return alert("Preencha tudo!");

    const senha = prompt("Digite a Chave de Acesso:");
    if (senha !== "amaioral") return alert("Acesso negado! ❌");

    try {
      const imagem = sigCanvas.current.getCanvas().toDataURL('image/png');
      const meuToken = Math.random().toString(36).substring(7);

      const docRef = await addDoc(collection(db, "assinaturas"), {
        convidado: nome,
        mensagem: mensagem,
        assinatura: imagem,
        data: new Date(),
        token: meuToken,
        local: userLocation // Usa a localização capturada no início
      });

      localStorage.setItem(`owner_${docRef.id}`, meuToken);
      setNome(""); setMensagem(""); setModalAberta(false);
    } catch (e) {
      alert("Erro ao conectar ao Firebase!");
    }
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
      
      <div onClick={() => setMemeAberto(true)} style={styles.memeButton}>
        <img src="/lady.png" alt="Meme" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </div>

      <header style={{textAlign: 'center', marginBottom: '50px'}}>
        <Heart fill="#F0B323" color="#F0B323" size={40} />
        <h1 style={styles.mainTitle}>MURAL DA MAIORAL</h1>
        <p style={{color: '#888'}}>Feliz "Calma amiga, ninguém esta vendo!"</p>
      </header>

      <div style={styles.grid}>
        {assinaturas.map((item, index) => (
          <CardHolografico 
            key={item.id} 
            item={item} 
            onDelete={apagar} 
            onSelect={setDetalheSeleccionado}
            isActive={index === activeIndex}
          />
        ))}
      </div>

      <button style={styles.fab} onClick={() => setModalAberta(true)}>
        <Plus size={35} color="white" />
      </button>

      {/* MODAL: CADASTRO */}
      {modalAberta && (
        <div style={styles.overlay}>
          <div style={styles.modalContent}>
            <h2 style={{color: '#F0B323', marginTop: 0}}>Nova Assinatura</h2>
            <input className="modal-input-field" placeholder="Seu Nome" value={nome} onChange={e => setNome(e.target.value)} />
            <textarea className="modal-input-field" style={{height: '80px', resize: 'none'}} placeholder="Mensagem..." value={mensagem} onChange={e => setMensagem(e.target.value)} maxLength={100} />
            <div className="canvas-wrapper">
              <SignatureCanvas ref={sigCanvas} penColor='#F0B323' backgroundColor='#ffffff' canvasProps={{width: 300, height: 150, className: 'sigCanvas', style: { maxWidth: '100%' }}} />
            </div>
            <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
              <button onClick={() => setModalAberta(false)} style={styles.btnSec}>Sair</button>
              <button onClick={salvar} style={styles.btnPri}>Enviar ✨</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETALHES */}
      {detalheSeleccionado && (
        <div style={styles.overlay} onClick={() => setDetalheSeleccionado(null)}>
          <div style={styles.detailModal} onClick={e => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
               <h2 style={{color: '#F0B323', margin: 0}}>{detalheSeleccionado.convidado}</h2>
               <X onClick={() => setDetalheSeleccionado(null)} style={{cursor: 'pointer'}} />
            </div>
            <hr style={{margin: '15px 0', border: '0.5px solid #eee'}} />
            <img src={detalheSeleccionado.assinatura} className="detail-modal-img" alt="Zoom" />
            <p style={{fontSize: '1.2rem', fontStyle: 'italic', margin: '20px 0'}}>"{detalheSeleccionado.mensagem}"</p>
            <div style={{display: 'flex', alignItems: 'center', color: '#888', fontSize: '0.8rem'}}>
              <MapPin size={14} style={{marginRight: '5px'}} />
              Local: {detalheSeleccionado.local}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MEME */}
      {memeAberto && (
        <div style={styles.overlay} onClick={() => setMemeAberto(false)} onMouseMove={(e) => {
          const x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
          const y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
          setMemeCoords({ x, y });
        }}>
          <div style={{
            ...styles.memeCard,
            transform: `perspective(1000px) rotateY(${memeCoords.x * 25}deg) rotateX(${-memeCoords.y * 25}deg)`
          }}>
            <div className="holo-bg" style={{opacity: 0.7}} />
            <img src="/lady.png" alt="Meme" style={{width: '100%', borderRadius: '15px'}} />
            <h3 style={{color: '#F0B323', margin: '15px 0 5px 0'}}>Chama de senhora! 😎</h3>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  appBody: { minHeight: '100vh', padding: '40px 20px', background: 'radial-gradient(circle, #ffffff, #fff9ea)' },
  mainTitle: { color: '#F0B323', letterSpacing: '4px', fontSize: '2.2rem', margin: '10px 0' },
  grid: { display: 'flex', flexWrap: 'wrap', gap: '30px', justifyContent: 'center' },
  fab: { position: 'fixed', bottom: '30px', right: '30px', width: '65px', height: '65px', borderRadius: '50%', backgroundColor: '#F0B323', border: 'none', cursor: 'pointer', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' },
  memeButton: { position: 'fixed', bottom: '30px', left: '30px', width: '60px', height: '60px', borderRadius: '50%', border: '3px solid #F0B323', overflow: 'hidden', cursor: 'pointer', zIndex: 90, backgroundColor: '#fff' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modalContent: { background: 'white', padding: '30px', borderRadius: '25px', width: '95%', maxWidth: '400px' },
  detailModal: { background: 'white', padding: '30px', borderRadius: '25px', width: '95%', maxWidth: '500px' },
  btnPri: { flex: 2, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#F0B323', color: 'white', fontWeight: 'bold', cursor: 'pointer' },
  btnSec: { flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #eee', backgroundColor: '#fff', cursor: 'pointer' },
  memeCard: { background: 'white', padding: '25px', borderRadius: '30px', textAlign: 'center', maxWidth: '350px', border: '5px solid #F0B323', position: 'relative', overflow: 'hidden' }
};

export default App;