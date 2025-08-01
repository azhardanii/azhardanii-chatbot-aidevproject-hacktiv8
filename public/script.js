const chatBox = document.getElementById('chat-box')
const form = document.getElementById('chat-form')
const input = document.getElementById('user-input')
const messages = []
let typingIndicator = null
let stagedFile = null

const initialPlaceholders = [
  "Haii, kenalan dulu yuk, nama mu siapa?",
  "Masalah apa yang mau diberesin??...",
  "Sedang sibuk apa hari ini?.."
]
const subsequentPlaceholder = "Lanjut ngobrol yukk! tulis disini..."
let placeholderIndex = 0
let isFirstChat = true
let placeholderInterval

function startPlaceholderRotation() {
  input.placeholder = initialPlaceholders[placeholderIndex]
  
  placeholderInterval = setInterval(() => {
      placeholderIndex = (placeholderIndex + 1) % initialPlaceholders.length
      input.placeholder = initialPlaceholders[placeholderIndex]
  }, 3000)
}
startPlaceholderRotation()

const sendSound = new Audio('/sounds/send.mp3');
const receiveSound = new Audio('/sounds/receive.mp3');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (isFirstChat) {
    clearInterval(placeholderInterval);
    input.placeholder = subsequentPlaceholder;
    input.classList.remove('input-fade-in', 'input-fade-out');
    input.style.opacity = 1; 
    isFirstChat = false;
  }

  const userText = input.value.trim();

  if (!stagedFile && !userText) return;

  if (stagedFile) {
    if (!userText) {
      alert('Tolong masukkan prompt untuk file yang diupload.');
      return;
    }
    appendFileMessageToChat('user', userText, stagedFile.file, stagedFile.type);
    
    showTypingIndicator();

    const formData = new FormData();
    formData.append(stagedFile.inputName, stagedFile.file);
    formData.append('prompt', userText);

    try {
      const res = await fetch(`/${stagedFile.endpoint}`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      hideTypingIndicator();
      appendMessage('bot', data.result, userText); 
    } catch (err) {
      hideTypingIndicator();
      appendMessage('bot', `Error uploading ${stagedFile.type}: ${err.message}`);
    }

    clearFileStage();
    input.value = '';

  } else {
    appendMessage('user', userText);
    messages.push({ role: 'user', content: userText });
    input.value = '';
    showTypingIndicator();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages })
      });

      const data = await response.json();
      hideTypingIndicator();

      if (response.ok) {
        messages.push({ role: 'bot', content: data.result });
        appendMessage('bot', data.result, userText);
      } else {
        appendMessage('bot', `Error: ${data.message}`);
      }
    } catch (err) {
      hideTypingIndicator();
      appendMessage('bot', `Error: ${err.message}`);
    }
  }
});

function appendFileMessageToChat(sender, prompt, file, type) {
    const wrapper = document.createElement('div')
    wrapper.className = `w-full flex mb-4 ${sender === 'user' ? 'justify-end' : 'justify-start'}`

    const msg = document.createElement('div')
    msg.className = 'message user flex flex-col items-start'
    msg.style.maxWidth = '75%'

    const caption = document.createElement('span')
    caption.textContent = prompt
    caption.className = 'mb-2'
    msg.appendChild(caption)
    
    if (type === 'image') {
        const preview = document.createElement('img')
        preview.src = URL.createObjectURL(file)
        preview.className = 'w-48 h-auto rounded-lg'
        preview.onload = () => URL.revokeObjectURL(preview.src)
        msg.appendChild(preview)
    } else if (type === 'audio') {
        const audio = document.createElement('audio')
        audio.controls = true
        audio.src = URL.createObjectURL(file)
        audio.className = 'w-full'
        audio.onloadeddata = () => URL.revokeObjectURL(audio.src)
        msg.appendChild(audio)
    } else if (type === 'document') {
       const docInfo = document.createElement('div')
       docInfo.className = 'bg-orange-500 p-3 rounded-lg flex items-center gap-2'
       docInfo.innerHTML = `📄 <span class="font-bold">${file.name}</span>`
       msg.appendChild(docInfo)
    }

    wrapper.appendChild(msg)
    chatBox.appendChild(wrapper)
    chatBox.scrollTop = chatBox.scrollHeight

    if (sender === 'user') {
      sendSound.currentTime = 0;
      sendSound.play();
  }
}

function appendMessage(sender, text, userPrompt = '') {
  const wrapper = document.createElement('div')
  wrapper.className = `w-full flex mb-4 ${sender === 'user' ? 'justify-end' : 'justify-start'}`

  const msg = document.createElement('div')
  msg.className = `message ${sender} animate-slide-up px-4 py-2 rounded-xl max-w-[75%] prose prose-base`;
  
  if (sender === 'bot') {
      if (typeof text === 'string' && text.trim() !== '') {
          let friendlyText = text.replace(/\bSAYA\b/gi, 'aku').replace(/\bANDA\b/gi, 'kamu');

          // <<< LOGIKA PINTAR DIMULAI DI SINI >>>
          // 1. Definisikan kata kunci yang menandakan pertanyaan tentang nama.
          const greetingKeywords = ['siapa', 'nama', 'name', 'siapakah'];
          // 2. Cek apakah prompt pengguna mengandung salah satu kata kunci tersebut.
          const userAskedForName = greetingKeywords.some(keyword => userPrompt.toLowerCase().includes(keyword));

          // 3. HANYA hapus perkenalan JIKA pengguna TIDAK bertanya tentang nama.
          if (!userAskedForName) {
              friendlyText = friendlyText.replace(/^Halo.*?Azhardanii.*?[,.]?\s*/i, '');
          }
          // <<< LOGIKA PINTAR SELESAI >>>

          if (friendlyText.length > 0) {
            friendlyText = friendlyText.charAt(0).toUpperCase() + friendlyText.slice(1);
          }
          msg.innerHTML = marked.parse(friendlyText);
      } else {
          msg.textContent = "Maaf, aku tidak bisa memproses hasil inputanmu itu."
      }
  } else {
      msg.textContent = text
  }

  wrapper.appendChild(msg)
  chatBox.appendChild(wrapper)
  chatBox.scrollTop = chatBox.scrollHeight

  if (sender === 'user') {
    sendSound.currentTime = 0;
    sendSound.play();
  } else {
      receiveSound.currentTime = 0;
      receiveSound.play();
  }
}

function showTypingIndicator() {
  if (typingIndicator) return
  typingIndicator = document.createElement('div')
  typingIndicator.className = 'w-full flex justify-start mb-4' 

  const inner = document.createElement('div')
  inner.className = 'message bot flex items-center gap-2 px-4 py-2 rounded-xl'
  inner.innerHTML = `
    <span>Azhardanii is typing</span>
    <span class="dot-typing">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </span>
  `

  typingIndicator.appendChild(inner)
  chatBox.appendChild(typingIndicator)
  chatBox.scrollTop = chatBox.scrollHeight
}

function hideTypingIndicator() {
  if (typingIndicator) {
    chatBox.removeChild(typingIndicator)
    typingIndicator = null
  }
}

function showFilePreview(file, type) {
  const previewContainer = document.getElementById('file-preview-container')
  let previewHTML = ''
  const fileUrl = URL.createObjectURL(file)

  if (type === 'image') {
    previewHTML = `<img src="${fileUrl}" class="h-16 w-16 object-cover rounded-md">`
  } else if (type === 'audio') {
    previewHTML = `<div class="p-2 text-4xl">🎵</div>`
  } else if (type === 'document') {
    previewHTML = `<div class="p-2 text-4xl">📄</div>`
  }

  previewContainer.innerHTML = `
    <div class="bg-orange-200 p-2 rounded-lg flex justify-between w-fit gap-5 animate-slide-up ml-10">
      <div class="flex items-center gap-3">
        ${previewHTML}
        <div class="text-sm text-gray-700">
          <p class="font-bold">${file.name}</p>
          <p>${(file.size / 1024).toFixed(2)} KB</p>
        </div>
      </div>
      <button id="cancel-upload-btn" type="button" class="text-gray-600 hover:text-red-500 text-2xl font-bold mr-2">&times</button>
    </div>
  `
  previewContainer.classList.remove('hidden')

  document.getElementById('cancel-upload-btn').addEventListener('click', () => {
    URL.revokeObjectURL(fileUrl)
    clearFileStage()
  })
}

function clearFileStage() {
  stagedFile = null
  const previewContainer = document.getElementById('file-preview-container')
  previewContainer.innerHTML = ''
  previewContainer.classList.add('hidden')
  
  document.getElementById('image-input').value = ''
  document.getElementById('document-input').value = ''
  document.getElementById('audio-input').value = ''
}

const handleUpload = (inputId, endpoint, type, inputName) => {
  const fileInput = document.getElementById(inputId)

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0]
    if (!file) return
    
    stagedFile = { file, endpoint, type, inputName }

    showFilePreview(file, type)
    
    document.getElementById('uploadMenu').classList.add('hidden')
    input.focus()
  })
}

handleUpload('image-input', 'api/generate-text-from-image', 'image', 'image')
handleUpload('document-input', 'api/generate-from-document', 'document', 'document')
handleUpload('audio-input', 'api/generate-from-audio', 'audio', 'audio')


document.getElementById('uploadMenuButton').addEventListener('click', (e) => {
  e.stopPropagation()
  document.getElementById('uploadMenu').classList.toggle('hidden')
})

document.addEventListener('click', (e) => {
    const menu = document.getElementById('uploadMenu')
    const button = document.getElementById('uploadMenuButton')
    if (!menu.contains(e.target) && !button.contains(e.target)) {
        menu.classList.add('hidden')
    }
})

const style = document.createElement('style')
style.textContent = `
.dot-typing { display: flex; align-items: center; gap: 4px; }
.dot { width: 6px; height: 6px; border-radius: 9999px; background-color: #fb923c; animation: bounce 1.2s infinite ease-in-out; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
@keyframes slide-up { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`
document.head.appendChild(style)