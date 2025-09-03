<template>
  <div class="chat-panel">
    <div class="panel-header">
      <h3>AI 助手</h3>
      <button class="new-chat-button" @click="$emit('new-chat')">
        新对话
      </button>
    </div>

    <!-- 聊天消息区域 -->
    <div class="chat-messages" ref="messagesContainer">
      <div v-if="messages.length === 0" class="welcome-view">
        <div class="welcome-icon">💬</div>
        <h4>欢迎使用 AI 助手</h4>
        <p>您可以询问关于 PDF 内容的问题，或者进行自由对话。</p>
      </div>
      
      <div 
        v-for="message in messages" 
        :key="message.id"
        class="message"
        :class="{ 'user-message': message.role === 'user', 'ai-message': message.role === 'assistant' }"
      >
        <div class="message-content">
          <div class="message-text">{{ message.content }}</div>
          <div class="message-time">{{ formatTime(message.timestamp) }}</div>
        </div>
      </div>

      <div v-if="isThinking" class="message ai-message thinking">
        <div class="message-content">
          <div class="thinking-indicator">
            <div class="thinking-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span class="thinking-text">AI 正在思考...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="chat-input-area">
      <div class="input-container">
        <textarea
          v-model="inputMessage"
          @keydown="handleKeyDown"
          @input="handleInput"
          placeholder="输入您的问题..."
          class="chat-input"
          rows="1"
          ref="textareaRef"
        ></textarea>
        
        <button 
          class="send-button"
          @click="sendMessage"
          :disabled="!inputMessage.trim() || isThinking"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import type { ChatMessage } from '@/types'

interface Props {
  messages: ChatMessage[]
  isThinking: boolean
}

interface Emits {
  (e: 'send-message', message: string): void
  (e: 'new-chat'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const inputMessage = ref('')
const messagesContainer = ref<HTMLElement>()
const textareaRef = ref<HTMLTextAreaElement>()

const sendMessage = () => {
  const message = inputMessage.value.trim()
  if (message) {
    emit('send-message', message)
    inputMessage.value = ''
    adjustTextareaHeight()
  }
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

const handleInput = () => {
  adjustTextareaHeight()
}

const adjustTextareaHeight = () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
    textareaRef.value.style.height = Math.min(textareaRef.value.scrollHeight, 120) + 'px'
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  } else {
    return date.toLocaleString('zh-CN', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }
}

// 监听消息变化，自动滚动到底部
watch(() => [props.messages, props.isThinking], () => {
  scrollToBottom()
}, { deep: true })
</script>

<style scoped>
.chat-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary-color);
}

.new-chat-button {
  padding: 6px 12px;
  background: transparent;
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s;
}

.new-chat-button:hover {
  background: var(--primary-color);
  color: white;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  margin-bottom: 16px;
}

.welcome-view {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary-color);
}

.welcome-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.welcome-view h4 {
  margin: 0 0 8px 0;
  color: var(--text-primary-color);
  font-weight: 600;
}

.welcome-view p {
  margin: 0;
  line-height: 1.5;
}

.message {
  margin-bottom: 16px;
  display: flex;
}

.user-message {
  justify-content: flex-end;
}

.ai-message {
  justify-content: flex-start;
}

.message-content {
  max-width: 85%;
  padding: 12px 16px;
  border-radius: 16px;
  position: relative;
}

.user-message .message-content {
  background: var(--user-message-bg);
  color: var(--text-primary-color);
  border-bottom-right-radius: 4px;
}

.ai-message .message-content {
  background: var(--ai-message-bg);
  color: var(--text-primary-color);
  border-bottom-left-radius: 4px;
  border: 1px solid var(--border-color);
}

.message-text {
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.message-time {
  font-size: 11px;
  color: var(--text-secondary-color);
  margin-top: 4px;
  text-align: right;
}

.ai-message .message-time {
  text-align: left;
}

.thinking {
  opacity: 0.8;
}

.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.thinking-dots {
  display: flex;
  gap: 4px;
}

.thinking-dots span {
  width: 6px;
  height: 6px;
  background: var(--primary-color);
  border-radius: 50%;
  animation: thinking-pulse 1.4s ease-in-out infinite both;
}

.thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
.thinking-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes thinking-pulse {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

.thinking-text {
  font-size: 14px;
  color: var(--text-secondary-color);
}

.chat-input-area {
  border-top: 1px solid var(--border-color);
  padding-top: 16px;
}

.input-container {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.chat-input {
  flex: 1;
  min-height: 40px;
  max-height: 120px;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  background: var(--input-background);
  color: var(--text-primary-color);
  resize: none;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.4;
  outline: none;
  transition: border-color 0.2s;
  overflow-y: auto;
}

/* 隐藏滚动条但保持滚动功能 */
.chat-input::-webkit-scrollbar {
  display: none;
}

.chat-input {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

.chat-input:focus {
  border-color: var(--primary-color);
}

.chat-input::placeholder {
  color: var(--text-secondary-color);
}

.send-button {
  width: 40px;
  height: 40px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-button:hover:not(:disabled) {
  background: var(--primary-hover-color);
  transform: scale(1.05);
}

.send-button:disabled {
  background: var(--border-color);
  cursor: not-allowed;
  transform: none;
}

.send-button svg {
  width: 18px;
  height: 18px;
}
</style>
