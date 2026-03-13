<template>
  <div class="result-page">
    <div class="result-header">
      <button class="back-btn" @click="goBack">← 返回</button>
      <text class="header-title">生成结果</text>
      <div style="width: 44px;"></div>
    </div>

    <div v-if="loading" class="loading-container">
      <text>加载中...</text>
    </div>

    <div v-else-if="task" class="result-content">
      <!-- 生成成功状态 -->
      <div v-if="isCompleted(task.status)" class="status-section">
        <text class="status-title">✅ 生成成功</text>
        <text class="status-time">完成时间：{{ formatTime(task.createdAt) }}</text>
      </div>

      <!-- 生成中状态 -->
      <div v-else-if="isProcessing(task.status)" class="status-section status-processing">
        <text class="status-title">⏳ 生成中</text>
        <text class="status-time">请稍候，通常需要30秒左右...</text>
      </div>

      <!-- 生成失败状态 -->
      <div v-else-if="isFailed(task.status)" class="status-section status-failed">
        <text class="status-title">❌ 生成失败</text>
        <text class="status-time">请重新尝试</text>
      </div>

      <!-- 结果图片（仅在完成时显示） -->
      <div v-if="isCompleted(task.status)" class="image-wrapper" @click="previewImage">
        <img 
          v-if="task.resultImage" 
          :src="task.resultImage" 
          class="result-img" 
          alt="result"
          @error="onImageError"
        />
        <div v-else class="loading-placeholder">图片加载中...</div>
        <div class="tip-overlay">点击图片全屏预览</div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-bar">
        <van-button 
          class="btn-home" 
          round 
          block 
          @click="goHome"
        >
          🏠 回到首页
        </van-button>
        <van-button 
          v-if="isCompleted(task.status)"
          class="btn-save" 
          round 
          block 
          type="primary" 
          @click="downloadImage"
        >
          💾 下载图片
        </van-button>
        <van-button 
          v-else-if="isFailed(task.status)"
          class="btn-retry" 
          round 
          block 
          type="primary" 
          @click="goHome"
        >
          🔄 返回重新生成
        </van-button>
      </div>
    </div>

    <div v-else class="error-container">
      <text>任务不存在或已过期</text>
      <van-button round block @click="goHome">返回首页</van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import request from '../utils/request';
import { showToast, showImagePreview, showFailToast } from 'vant';

const router = useRouter();
const route = useRoute();

const loading = ref(true);
const task = ref(null);

const goBack = () => {
  router.push('/tasks');
};

const goHome = () => {
  router.push('/upload');
};

const formatTime = (isoString) => {
  if (!isoString) return '刚刚';
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
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

const isProcessing = (status) => {
  const s = String(status).toLowerCase();
  return ['processing', 'generating', 'pending'].includes(s);
};

const isFailed = (status) => {
  const s = String(status).toLowerCase();
  return ['failed', 'error', 'polling_error'].includes(s);
};

const previewImage = () => {
  if (task.value?.resultImage) {
    showImagePreview([task.value.resultImage]);
  } else {
    showToast('图片加载中，请稍候');
  }
};

const downloadImage = async () => {
  if (!task.value?.resultImage) {
    showFailToast('图片加载失败');
    return;
  }

  try {
    const link = document.createElement('a');
    link.href = task.value.resultImage;
    link.download = `dressme-${new Date().getTime()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast({ message: '下载成功', type: 'success' });
  } catch (error) {
    showFailToast('下载失败');
  }
};

const onImageError = (e) => {
  console.error('Image load error:', e);
  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f0f0f0" width="200" height="200"/%3E%3Ctext x="50" y="100" fill="%23999" font-size="14"%3E图片加载失败%3C/text%3E%3C/svg%3E';
};

const fetchTaskDetail = async (taskId) => {
  try {
    loading.value = true;
    const res = await request.get(`/v1/tasks/${taskId}`);
    
    // 从localStorage中查找任务完整信息
    const allTasks = JSON.parse(localStorage.getItem('my_tasks') || '[]');
    const localTask = allTasks.find(t => t.id === taskId);
    
    // 确保status正确设置（优先使用API返回的status）
    const status = res.status || localTask?.status || 'pending';
    
    if (localTask) {
      task.value = {
        ...localTask,
        status: status,
        resultImage: res.result_image_url || localTask.resultImage
      };
    } else {
      task.value = {
        id: taskId,
        status: status,
        resultImage: res.result_image_url,
        createdAt: new Date().toISOString()
      };
    }
    
    console.log('[Result.vue] Task loaded:', {
      id: task.value.id,
      status: task.value.status,
      hasImage: !!task.value.resultImage
    });
  } catch (error) {
    console.error('Failed to fetch task detail:', error);
    showFailToast('加载失败，请重试');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  const taskId = route.params.id;
  if (taskId) {
    fetchTaskDetail(taskId);
  } else {
    loading.value = false;
  }
});
</script>

<style scoped>
.result-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF5F7 0%, #F0F4FF 100%);
  padding: 0;
  padding-bottom: 40px;
}

.result-header {
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
  height: 44px;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  flex: 1;
  text-align: center;
}

.back-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: #333;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  white-space: nowrap;
  min-width: auto;
}

.back-btn:active {
  opacity: 0.7;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  gap: 20px;
  padding: 20px;
}

.result-content {
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-section {
  background: white;
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  text-align: center;
}

.status-section.status-processing {
  background: linear-gradient(135deg, #FFF7E6 0%, #FFE9CC 100%);
  border: 1px solid #FFD98F;
}

.status-section.status-processing .status-title {
  color: #FF9500;
}

.status-section.status-processing .status-time {
  color: #FF9500;
}

.status-section.status-failed {
  background: linear-gradient(135deg, #FFE5E5 0%, #FFCCCC 100%);
  border: 1px solid #FF9999;
}

.status-section.status-failed .status-title {
  color: #FF3333;
}

.status-section.status-failed .status-time {
  color: #FF3333;
}

.status-title {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.status-time {
  display: block;
  font-size: 12px;
  color: #999;
}

.image-wrapper {
  width: 100%;
  max-width: 600px;
  margin: 0 auto 12px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;
  cursor: pointer;
}

.image-inner {
  width: 100%;
  position: relative;
}

.result-img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 12px;
}

.loading-placeholder {
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #999;
  font-size: 14px;
}

.tip-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 12px;
  font-size: 12px;
  text-align: center;
}

.action-bar {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.action-bar :deep(.van-button) {
  flex: 1;
  height: 44px;
  font-size: 14px;
}

.btn-home {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-save {
  background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
}

.btn-retry {
  background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
}
</style>
