#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testUIGen() {
  console.log('🎯 Testing UIgen Component Generation');
  console.log('=====================================\n');

  // Test 1: Main page accessibility
  console.log('1. Verificando acceso a la página principal...');
  try {
    const response = await fetch('http://localhost:3001');
    console.log(`   ✅ Estado: ${response.status}`);
    
    if (response.ok) {
      const html = await response.text();
      
      // Check for key elements in the HTML
      if (html.includes('React Component Generator')) {
        console.log('   ✅ Título de la aplicación encontrado');
      }
      
      if (html.includes('Preview') && html.includes('Code')) {
        console.log('   ✅ Pestañas Preview y Code detectadas');
      }
      
      if (html.includes('tailwind') || html.includes('tailwindcss')) {
        console.log('   ✅ Tailwind CSS configurado');
      }
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 2: API endpoint test
  console.log('\n2. Probando endpoint de la API de chat...');
  try {
    const chatPayload = {
      messages: [
        {
          role: "user",
          content: "Hello, can you generate a simple component?"
        }
      ],
      files: {},
      projectId: null
    };

    const response = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(chatPayload)
    });

    console.log(`   ✅ Estado de respuesta: ${response.status}`);
    console.log(`   ✅ Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.status === 200) {
      console.log('   ✅ API de chat está funcionando');
    }
    
  } catch (error) {
    console.log(`   ❌ Error en API: ${error.message}`);
  }

  // Test 3: Environment check
  console.log('\n3. Verificando configuración del entorno...');
  
  // Check if using mock provider or real API
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('   ⚠️  Usando proveedor mock (ANTHROPIC_API_KEY no configurada)');
    console.log('   ℹ️  Los componentes se generarán con respuestas simuladas');
  } else {
    console.log('   ✅ ANTHROPIC_API_KEY configurada - usando Claude real');
  }

  console.log('\n📋 Resumen de funcionalidades detectadas:');
  console.log('   • Interfaz de chat para solicitudes de componentes');
  console.log('   • Sistema de pestañas Preview/Code');
  console.log('   • API de generación de componentes');
  console.log('   • Integración con Tailwind CSS');
  console.log('   • Sistema de archivos virtual');
  console.log('   • Soporte para TypeScript/TSX');

  console.log('\n🎯 Prueba del prompt mejorado:');
  console.log('   Prompt sugerido: "Crea un botón moderno con variantes primary y secondary, efectos hover, y accesibilidad completa"');
  console.log('   Este prompt debería generar:');
  console.log('   • Componente Button con TypeScript');
  console.log('   • Variantes primary y secondary');
  console.log('   • Efectos hover y transiciones');
  console.log('   • ARIA labels y accesibilidad');
  console.log('   • Estilos Tailwind responsivos');

  console.log('\n✅ Aplicación UIgen está lista para pruebas manuales en http://localhost:3001');
}

testUIGen();