import React, { useState } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { Coffee, QrCode, PlusCircle, Search, CheckCircle } from 'lucide-react';

const API_URL = 'http://localhost:3000/api/v1/lotes';

export default function App() {
  const [vista, setVista] = useState('registrar');
  
  const [form, setForm] = useState({
    codigoLote: '',
    idParcela: 'd3b07384-d113-424a-a53d-2f00a5d5a2d0',
    variedad: 'Typica',
    pesoKg: '',
    altitudMsnm: '1600',
    fechaCosecha: new Date().toISOString().split('T')[0]
  });

  const [codigoBusqueda, setCodigoBusqueda] = useState('');
  const [loteObtenido, setLoteObtenido] = useState(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegistrar = async (e) => {
    e.preventDefault();
    setMensaje({ tipo: '', texto: '' });
    try {
      // 1. Usar la variable de estado 'form' y la constante 'API_URL'
      const res = await axios.post(API_URL, form);
      
      // 2. Soporte para respuesta directa o anidada en data
      const loteRegistrado = res.data.data || res.data;
      
      setMensaje({ tipo: 'éxito', texto: `¡Lote ${form.codigoLote} registrado correctamente!` });
      setLoteObtenido(loteRegistrado);
      setCodigoBusqueda(form.codigoLote);
      setVista('consultar');
    } catch (err) {
      setMensaje({ 
        tipo: 'error', 
        texto: err.response?.data?.mensaje || 'Error al registrar el lote en el servidor' 
      });
    }
  };

  const handleConsultar = async (e) => {
    e?.preventDefault();
    setMensaje({ tipo: '', texto: '' });
    try {
      const res = await axios.get(`${API_URL}/${codigoBusqueda}`);
      setLoteObtenido(res.data.data);
    } catch (err) {
      setLoteObtenido(null);
      setMensaje({ tipo: 'error', texto: err.response?.data?.mensaje || 'Lote no encontrado' });
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #8B4513', paddingBottom: '15px' }}>
        <Coffee size={36} color="#8B4513" />
        <div>
          <h1 style={{ margin: 0, color: '#2C1810' }}>Trazabilidad de Café Amazónico</h1>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Chanchamayo - Junín, Perú</p>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px', marginBottom: '20px' }}>
        <button 
          onClick={() => setVista('registrar')}
          style={{
            padding: '10px 20px',
            backgroundColor: vista === 'registrar' ? '#8B4513' : '#e0e0e0',
            color: vista === 'registrar' ? '#fff' : '#333',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
          <PlusCircle size={18} /> Registrar Lote
        </button>

        <button 
          onClick={() => setVista('consultar')}
          style={{
            padding: '10px 20px',
            backgroundColor: vista === 'consultar' ? '#8B4513' : '#e0e0e0',
            color: vista === 'consultar' ? '#fff' : '#333',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
          <Search size={18} /> Consultar / Generar QR
        </button>
      </div>

      {mensaje.texto && (
        <div style={{
          padding: '10px 15px',
          borderRadius: '5px',
          marginBottom: '20px',
          backgroundColor: mensaje.tipo === 'éxito' ? '#d4edda' : '#f8d7da',
          color: mensaje.tipo === 'éxito' ? '#155724' : '#721c24'
        }}>
          {mensaje.texto}
        </div>
      )}

      {vista === 'registrar' && (
        <form onSubmit={handleRegistrar} style={{ display: 'grid', gap: '15px', background: '#fdfbf7', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h3>Nuevo Lote de Cosecha</h3>
          
          <div>
            <label style={{ display: 'block', fontWeight: 'bold' }}>Código del Lote:</label>
            <input name="codigoLote" value={form.codigoLote} onChange={handleChange} placeholder="Ej: LOTE-CHANCHAMAYO-01" required style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold' }}>Variedad:</label>
              <select name="variedad" value={form.variedad} onChange={handleChange} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
                <option value="Typica">Typica</option>
                <option value="Bourbon">Bourbon</option>
                <option value="Caturra">Caturra</option>
                <option value="Geisha">Geisha</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold' }}>Peso (Kg):</label>
              <input type="number" name="pesoKg" value={form.pesoKg} onChange={handleChange} placeholder="500" required style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold' }}>Altitud (msnm):</label>
              <input type="number" name="altitudMsnm" value={form.altitudMsnm} onChange={handleChange} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold' }}>Fecha de Cosecha:</label>
              <input type="date" name="fechaCosecha" value={form.fechaCosecha} onChange={handleChange} required style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
            </div>
          </div>

          <button type="submit" style={{ padding: '12px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
            Guardar Lote y Generar Hash
          </button>
        </form>
      )}

      {vista === 'consultar' && (
        <div style={{ background: '#fdfbf7', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h3>Búsqueda de Trazabilidad</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input 
              value={codigoBusqueda} 
              onChange={(e) => setCodigoBusqueda(e.target.value)} 
              placeholder="Ingrese código de lote..." 
              style={{ flex: 1, padding: '8px' }} 
            />
            <button onClick={handleConsultar} style={{ padding: '8px 20px', background: '#8B4513', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Buscar
            </button>
          </div>

          {loteObtenido && (
            <div style={{ borderTop: '2px dashed #ccc', paddingTop: '20px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#2e7d32', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={20} /> Lote Verificado
                </h4>
                <p><strong>Código:</strong> {loteObtenido.codigoLote}</p>
                <p><strong>Variedad:</strong> {loteObtenido.variedad}</p>
                <p><strong>Peso:</strong> {loteObtenido.pesoKg} Kg</p>
                <p><strong>Altitud:</strong> {loteObtenido.altitudMsnm} msnm</p>
                <p><strong>Estado:</strong> <span style={{ background: '#e0f2f1', padding: '3px 8px', borderRadius: '4px' }}>{loteObtenido.estado}</span></p>
                <p style={{ wordBreak: 'break-all', fontSize: '12px', color: '#555' }}>
                  <strong>Hash SHA-256:</strong><br />
                  <code>{loteObtenido.hashVerificacion}</code>
                </p>
              </div>

              <div style={{ textTransform: 'uppercase', textAlign: 'center', background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                <QRCodeSVG value={`http://localhost:3000/api/v1/lotes/${loteObtenido.codigoLote}`} size={140} />
                <p style={{ fontSize: '11px', marginTop: '8px', color: '#666' }}>Código QR del Lote</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}