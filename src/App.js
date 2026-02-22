import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from "firebase/firestore";
import { Plus, Trash2, Heart } from 'lucide-react';
import './App.css'; 

// --- CONFIGURAÇÃO DO SEU FIREBASE ---
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

// --- COMPONENTE: CARD HOLOGRÁFICO (Efeito 3D individual) ---
const CardHolografico = ({ item, onDelete }) => {
  const cardRef = useRef(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    setCoords({ x, y });
  };

  const resetCoords = () => setCoords({ x: 0, y: 0 });

  return (
    <div 
      className="card-mercy" 
      ref={cardRef} 
      onMouseMove={handleMouseMove} 
      onMouseLeave={resetCoords}
      style={{
        transform: `perspective(1000px) rotateY(${coords.x * 15}deg) rotateX(${-coords.y * 15}deg)`,
        '--ratio-x': coords.x,
        '--ratio-y': coords.y
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
          <Trash2 
            size={18} 
            color="#ff4b5c" 
            style={{cursor: 'pointer'}} 
            onClick={(e) => onDelete(e, item.id, item.token)} 
          />
        )}
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
function App() {
  const [assinaturas, setAssinaturas] = useState([]);
  const [modalAberta, setModalAberta] = useState(false);
  const [memeAberto, setMemeAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [memeCoords, setMemeCoords] = useState({ x: 0, y: 0 });
  const sigCanvas = useRef({});

  // Escutar banco de dados em tempo real
  useEffect(() => {
    const q = query(collection(db, "assinaturas"), orderBy("data", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAssinaturas(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const salvar = async () => {
    if (sigCanvas.current.isEmpty() || !nome || !mensagem) {
      return alert("Preencha o nome, mensagem e assinatura, recruta!");
    }
    
    try {
      const imagem = sigCanvas.current.getCanvas().toDataURL('image/png');
      const meuToken = Math.random().toString(36).substring(7);

      const docRef = await addDoc(collection(db, "assinaturas"), {
        convidado: nome,
        mensagem: mensagem,
        assinatura: imagem,
        data: new Date(),
        token: meuToken
      });

      localStorage.setItem(`owner_${docRef.id}`, meuToken);
      setNome(""); setMensagem(""); setModalAberta(false);
      alert("Heróis nunca morrem! Assinatura enviada. ✨");
    } catch (e) {
      alert("Erro ao conectar ao Firebase!");
    }
  };

  const apagar = async (e, id, tokenRemoto) => {
    e.stopPropagation();
    if (localStorage.getItem(`owner_${id}`) === tokenRemoto) {
      if (window.confirm("Deseja remover sua marca do mural?")) {
        await deleteDoc(doc(db, "assinaturas", id));
      }
    }
  };

  const handleMemeMove = (e) => {
    const x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    const y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    setMemeCoords({ x, y });
  };

  return (
    <div className="app-container" style={styles.appBody}>
      
      {/* Easter Egg: Meme lady.png */}
      <div onClick={() => setMemeAberto(true)} style={styles.memeButton}>
        <img src="/lady.png" alt="Meme" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </div>

      <header style={{textAlign: 'center', marginBottom: '50px'}}>
        <Heart fill="#F0B323" color="#F0B323" size={40} />
        <h1 style={styles.mainTitle}>MURAL DA MAIORAL</h1>
        <p style={{color: '#888'}}>Feliz "Calma amiga, ninguém esta vendo."</p>
      </header>

      {/* Grid de Assinaturas */}
      <div style={styles.grid}>
        {assinaturas.map(item => (
          <CardHolografico key={item.id} item={item} onDelete={apagar} />
        ))}
      </div>

      {/* Botão FAB para Adicionar */}
      <button style={styles.fab} onClick={() => setModalAberta(true)}>
        <Plus size={35} color="white" />
      </button>

      {/* Modal: Cadastro de Assinatura */}
      {modalAberta && (
        <div style={styles.overlay}>
          <div style={styles.modalContent}>
            <h2 style={{color: '#F0B323', marginTop: 0}}>Nova Assinatura</h2>
            <input 
              style={styles.input} 
              placeholder="Seu Nome" 
              value={nome} 
              onChange={e => setNome(e.target.value)} 
            />
            <textarea 
              style={{...styles.input, height: '80px', resize: 'none'}} 
              placeholder="Mensagem (máx 100 caracteres)" 
              value={mensagem} 
              onChange={e => setMensagem(e.target.value)} 
              maxLength={100} 
            />
            
            <div style={styles.canvasContainer}>
              <SignatureCanvas 
                ref={sigCanvas} 
                penColor='#F0B323' 
                backgroundColor='#ffffff'
                canvasProps={{width: 300, height: 150, className: 'sigCanvas'}} 
              />
            </div>

            <div style={{display: 'flex', gap: '10px'}}>
              <button onClick={() => setModalAberta(false)} style={styles.btnSec}>Sair</button>
              <button onClick={salvar} style={styles.btnPri}>Enviar ✨</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Visualização do Meme 3D */}
      {memeAberto && (
        <div 
          style={styles.overlay} 
          onClick={() => setMemeAberto(false)} 
          onMouseMove={handleMemeMove}
        >
          <div style={{
            ...styles.memeCard,
            transform: `perspective(1000px) rotateY(${memeCoords.x * 25}deg) rotateX(${-memeCoords.y * 25}deg)`
          }}>
            <div className="holo-bg" style={{opacity: 0.7}} />
            <img src="/lady.png" alt="Meme Mercy" style={{width: '100%', borderRadius: '15px'}} />
            <h3 style={{color: '#F0B323', margin: '15px 0 5px 0'}}>Calma, vai dar certo 😇</h3>
            <p style={{fontSize: '0.8rem', color: '#999'}}>Card lendário desbloqueado</p>
          </div>
        </div>
      )}
    </div>
  );
}

// --- ESTILOS AUXILIARES ---
const styles = {
  appBody: { minHeight: '100vh', padding: '40px 20px', background: 'radial-gradient(circle, #ffffff, #fff9ea)' },
  mainTitle: { color: '#F0B323', letterSpacing: '4px', fontSize: '2.2rem', margin: '10px 0' },
  grid: { display: 'flex', flexWrap: 'wrap', gap: '30px', justifyContent: 'center' },
  fab: { position: 'fixed', bottom: '30px', right: '30px', width: '65px', height: '65px', borderRadius: '50%', backgroundColor: '#F0B323', border: 'none', cursor: 'pointer', boxShadow: '0 10px 20px rgba(240,179,35,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  memeButton: { position: 'fixed', bottom: '30px', left: '30px', width: '60px', height: '60px', borderRadius: '50%', border: '3px solid #F0B323', overflow: 'hidden', cursor: 'pointer', zIndex: 90, backgroundColor: '#fff', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(255,255,255,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' },
  modalContent: { background: 'white', padding: '30px', borderRadius: '25px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.1)', border: '1px solid #eee' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '10px', border: '2px solid #f0f0f0', outlineColor: '#F0B323' },
  canvasContainer: { border: '2px dashed #F0B323', borderRadius: '15px', overflow: 'hidden', marginBottom: '20px', background: '#fff' },
  btnPri: { flex: 2, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#F0B323', color: 'white', fontWeight: 'bold', cursor: 'pointer' },
  btnSec: { flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #eee', backgroundColor: '#fff', cursor: 'pointer' },
  memeCard: { background: 'white', padding: '25px', borderRadius: '30px', textAlign: 'center', maxWidth: '350px', border: '5px solid #F0B323', boxShadow: '0 30px 70px rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden' }
};

export default App;