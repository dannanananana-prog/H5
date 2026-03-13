<template>
  <div class="tasks-page">
    <div class="task-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">← 返回</button>
      </div>
      <text class="header-tip">—— 生成试穿结果预计2-3分钟 ——</text>
    </div>

    <div class="task-list">
      <div v-for="task in tasks" :key="task.id" class="task-item" :data-status="task.status">
        <div class="item-image">
          <img 
            :src="getImageUrl(task)" 
            @click="showDetail(task)"
            class="task-img"
            @error="onImageError"
          />
        </div>
        
        <div class="item-right">
          <div class="top-row">
            <text class="time-text">{{ formatTime(task.createdAt) }}</text>
            <div class="status-badge" :class="'badge-' + task.status">
              <text v-if="isCompleted(task.status)">✅ 已完成</text>
              <text v-else-if="isFailed(task.status)">❌ 失败</text>
              <text v-else>⚡ 生成中...</text>
            </div>
          </div>
          <text class="hidden-id">{{ task.id }}</text>

          <!-- 失败重试按钮 -->
          <div v-if="isFailed(task.status)" class="regenerate-btn" @click="regenerateTask(task)">
            <text>重新生成</text>
          </div>

          <!-- 完成后操作栏 -->
          <div v-if="isCompleted(task.status)" class="action-bar">
            <div class="action-btn" :class="task.markedVisited ? 'active' : 'inactive'" @click="markVisited(task)">
              <text class="btn-icon">📍</text>
              <text class="btn-text">到店</text>
            </div>
            <div class="action-btn" :class="task.markedOrdered ? 'active' : 'inactive'" @click="showOrderModal(task)">
              <text class="btn-icon">💰</text>
              <text class="btn-text">下单</text>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="tasks.length === 0" class="empty-state">
      <text>暂无试穿记录</text>
    </div>

    <!-- 下单弹窗 -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal"></div>
    <div v-if="showModal" class="modal-container">
      <div class="modal-content">
        <div class="modal-title">输入订单号</div>
        <text class="modal-subtitle">系统将自动从末位识别数字</text>
        
        <input 
          v-model="orderNumber"
          type="text"
          class="modal-input"
          placeholder="请输入订单号"
          maxlength="20"
          @keyup.enter="confirmOrder"
        />
        
        <div class="modal-buttons">
          <div class="btn-cancel" @click="closeModal">
            <text>取消</text>
          </div>
          <div class="btn-confirm" @click="confirmOrder">
            <text>确认</text>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import request from '../utils/request';
import { showToast, showFailToast } from 'vant';

const router = useRouter();
const tasks = ref([]);
const showModal = ref(false);
const orderNumber = ref('');
const currentTaskId = ref('');
const pollingTimers = ref({});

const loadTasks = () => {
  const raw = localStorage.getItem('my_tasks') || '[]';
  tasks.value = JSON.parse(raw);
};

const getImageUrl = (task) => {
  // 完成状态显示结果图片
  if (isCompleted(task.status) && task.resultImage) {
    return task.resultImage;
  }
  // 否则显示客户上传的人物图片
  if (task.customerImage) {
    return task.customerImage;
  }
  // 如果都没有，返回空字符串
  return '';
};

const onImageError = (e) => {
  console.error('Image load error:', e);
  // 可选：设置一个默认的占位图
  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f0f0f0" width="200" height="200"/%3E%3Ctext x="50" y="100" fill="%23999" font-size="14"%3E图片加载失败%3C/text%3E%3C/svg%3E';
};

const goBack = () => {
  router.push('/upload');
};

const formatTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', { 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const isCompleted = (status) => {
  const s = String(status).toLowerCase();
  return ['completed', 'success'].includes(s);
};

const isFailed = (status) => {
  const s = String(status).toLowerCase();
  return ['failed', 'error', 'polling_error'].includes(s);
};

const showDetail = (task) => {
  if (isCompleted(task.status) && task.resultImage) {
    router.push(`/result/${task.id}`);
  } else if (isFailed(task.status)) {
    showToast('任务生成失败，请重新生成');
  } else {
    showToast('任务生成中，请稍候');
  }
};

const updateTaskStatus = async (taskId) => {
  try {
    const res = await request.get(`/v1/tasks/${taskId}`);
    const taskIdx = tasks.value.findIndex(t => t.id === taskId);
    if (taskIdx >= 0) {
      const task = tasks.value[taskIdx];
      if (res.status) task.status = res.status;
      // 关键修复：后端返回的是 result_image_url 不是 result_url
      if (res.result_image_url) task.resultImage = res.result_image_url;
      
      console.log(`[updateTaskStatus] Task ${taskId}:`, {
        status: task.status,
        resultImage: task.resultImage
      });
      
      // 终止状态的任务停止轮询
      if (isCompleted(task.status) || isFailed(task.status)) {
        if (pollingTimers.value[taskId]) {
          clearInterval(pollingTimers.value[taskId]);
          delete pollingTimers.value[taskId];
        }
      }
      
      localStorage.setItem('my_tasks', JSON.stringify(tasks.value));
    }
  } catch (e) {
    console.error('Failed to update task status:', e);
  }
};

const startPolling = (taskId) => {
  if (pollingTimers.value[taskId]) return; // Already polling
  
  pollingTimers.value[taskId] = setInterval(async () => {
    await updateTaskStatus(taskId);
  }, 3000); // Poll every 3 seconds
};

const markVisited = (task) => {
  task.markedVisited = !task.markedVisited;
  localStorage.setItem('my_tasks', JSON.stringify(tasks.value));
  showToast({ message: task.markedVisited ? '已标记到店' : '取消到店', type: 'success' });
};

const showOrderModal = (task) => {
  currentTaskId.value = task.id;
  orderNumber.value = '';
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  currentTaskId.value = '';
  orderNumber.value = '';
};

const confirmOrder = () => {
  if (!orderNumber.value.trim()) {
    showToast('请输入订单号');
    return;
  }
  
  const taskIdx = tasks.value.findIndex(t => t.id === currentTaskId.value);
  if (taskIdx >= 0) {
    tasks.value[taskIdx].markedOrdered = true;
    tasks.value[taskIdx].orderNumber = orderNumber.value;
    localStorage.setItem('my_tasks', JSON.stringify(tasks.value));
    showToast({ message: '订单已记录', type: 'success' });
    closeModal();
  }
};

const regenerateTask = async (task) => {
  try {
    showToast('正在重新生成...');
    
    const params = new URLSearchParams();
    params.append('prompt', task.prompt || 'High quality, photorealistic, fashion style');
    params.append('person_urls', JSON.stringify([task.customerImage]));
    
    // 重新提交衣物信息
    if (task.garmentId) {
      params.append('garment_id', String(task.garmentId));
    } else if (task.garmentUrl) {
      params.append('garment_urls', JSON.stringify([task.garmentUrl]));
    }
    
    const res = await request.post('/v1/tasks/try-on', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    if (res.task_id) {
      // 添加新任务到列表
      const newTask = {
        id: res.task_id,
        status: 'pending',
        createdAt: new Date().toISOString(),
        customerImage: task.customerImage,
        garmentId: task.garmentId || null,
        garmentUrl: task.garmentUrl || null,
        prompt: task.prompt || 'High quality, photorealistic, fashion style'
      };
      tasks.value.unshift(newTask);
      localStorage.setItem('my_tasks', JSON.stringify(tasks.value));
      
      showToast({ message: '已提交新的生成任务，请稍候...', type: 'success' });
      
      // 开始轮询新任务
      startPolling(res.task_id);
      updateTaskStatus(res.task_id);
    }
  } catch (error) {
    console.error('Regenerate error:', error);
    showFailToast('重新生成失败，请重试');
  }
};

onMounted(() => {
  loadTasks();
  
  // Start polling for incomplete tasks
  tasks.value.forEach(task => {
    if (!isCompleted(task.status) && !isFailed(task.status)) {
      startPolling(task.id);
      updateTaskStatus(task.id);
    }
  });
});
</script>

<style scoped>
.tasks-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF5F7 0%, #F0F4FF 100%);
  padding: 0;
  padding-bottom: 40px;
}

.task-header {
  padding: 12px 20px;
  margin-top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  flex: 0 0 auto;
}

.back-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: #333;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
}

.back-btn:hover {
  opacity: 0.7;
}

.task-header::after {
  content: '';
  flex: 1;
}

.header-tip {
  font-size: 14px;
  color: #999;
  font-weight: 400;
  white-space: nowrap;
  flex: 1 1 auto;
  text-align: center;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 12px;
  margin-top: 20px;
}

.task-item {
  background: #ffffff;
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.item-image {
  width: 120px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  background: #f8f8f8;
  flex-shrink: 0;
}

.task-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  cursor: pointer;
}

.item-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  min-width: 0;
}

.top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 8px;
}

.time-text {
  font-size: 12px;
  color: #aaa;
  font-weight: 400;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.badge-completed,
.badge-success {
  background: #e6f7ed;
  color: #52c41a;
}

.badge-failed,
.badge-error,
.badge-polling_error {
  background: #fff7e6;
  color: #fa8c16;
}

.badge-pending {
  background: #e6f4ff;
  color: #1890ff;
}

.hidden-id {
  font-size: 12px;
  color: transparent;
  height: 0;
  overflow: hidden;
  display: none;
}

.regenerate-btn {
  margin-top: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
  border: none;
  border-radius: 12px;
  text-align: center;
  color: white;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
  display: inline-block;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
}

.regenerate-btn:hover {
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
  transform: translateY(-2px);
}

.action-bar {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.action-btn {
  flex: 1;
  padding: 8px 12px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
  font-weight: 500;
  border: 2px solid #ddd;
}

.action-btn.inactive {
  background: #f9f9f9;
  color: #999;
}

.action-btn.active {
  background: #e6f4ff;
  border-color: #1890ff;
  color: #1890ff;
}

.action-btn:hover {
  border-color: #667eea;
  background: #f5f5ff;
}

.btn-icon {
  font-size: 14px;
}

.btn-text {
  font-size: 11px;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

.modal-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border-radius: 20px;
  padding: 32px;
  max-width: 380px;
  width: 90%;
  z-index: 1001;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.modal-subtitle {
  font-size: 14px;
  color: #999;
}

.modal-input {
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;
}

.modal-input:focus {
  border-color: #667eea;
}

.modal-buttons {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 12px 16px;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  border: 2px solid #ddd;
  color: #999;
  background: white;
}

.btn-cancel:hover {
  border-color: #999;
}

.btn-confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-confirm:hover {
  opacity: 0.9;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  font-size: 16px;
}
</style>
