<template>
  <div class="upload-page">
    <div class="page-header">
      <div class="header-avatar">🌵</div>
      <div class="header-left">
        <div class="title-bold">AI 试衣间</div>
        <div class="title-tip">让我们遇见最美的自己</div>
      </div>
      <div class="history-area" @click="goToHistory">
        <text class="history-label">试穿<br/>历史</text>
        <div class="history-badge">
          <span class="history-icon">⏱️</span>
        </div>
      </div>
    </div>

    <!-- 步骤 1: 上传人像 -->
    <div class="main-card">
      <div class="card-header">
        <div class="badge">01</div>
        <text class="label">上传客人美照</text>
      </div>
      <div class="upload-wrapper">
        <div class="mini-upload-box" @click="selectPersonImage">
          <img 
            v-if="personUrl" 
            :src="personUrl" 
            class="img-preview" 
            alt="person"
          />
          <div v-else class="placeholder">
            <div class="camera-icon">📷</div>
            <text class="plus-text">添加人像</text>
          </div>
          <div v-if="personUrl" class="change-overlay">更换</div>
        </div>
      </div>
    </div>

    <!-- 步骤 2: 选择衣物 -->
    <div class="main-card">
      <div class="card-header">
        <div class="badge">02</div>
        <text class="label">添加试穿单品</text>
      </div>
      <div class="btn-grid">
        <div class="grid-item" @click="goToGallery">
          <div class="grid-icon-wrapper search">🔍</div>
          <text>商品库选</text>
        </div>
        <div class="grid-item" @click="uploadGarmentPhoto">
          <div class="grid-icon-wrapper camera">📸</div>
          <text>拍照上传</text>
        </div>
      </div>

      <!-- 已选单品预览 -->
      <div v-if="selectedGarments.length > 0" class="selected-preview">
        <div class="preview-title">已选单品 ({{ selectedGarments.length }})</div>
        <div class="thumb-scroll">
          <div class="thumb-list">
            <div v-for="(item, idx) in selectedGarments" :key="idx" class="thumb-item">
              <img :src="extractImageUrl(item)" class="thumb-img" alt="garment" />
              <div class="remove-icon" @click="removeGarment(idx)">×</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 步骤 3: 选择场景 -->
    <div class="main-card">
      <div class="card-header">
        <div class="badge">03</div>
        <text class="label">选择试穿场景</text>
      </div>
      <div class="scene-grid">
        <div class="scene-row">
          <div 
            v-for="item in scenes.slice(0, 4)" 
            :key="item.id"
            class="scene-item" 
            :class="{ active: selectedScene === item.id }"
            @click="toggleScene(item.id)"
          >
            <div class="scene-icon">{{ item.icon }}</div>
            <text class="scene-name">{{ item.name }}</text>
          </div>
        </div>
        <div class="scene-row">
          <div 
            v-for="item in scenes.slice(4, 8)" 
            :key="item.id"
            class="scene-item" 
            :class="{ active: selectedScene === item.id }"
            @click="toggleScene(item.id)"
          >
            <div class="scene-icon">{{ item.icon }}</div>
            <text class="scene-name">{{ item.name }}</text>
          </div>
        </div>
      </div>
    </div>

    <!-- 生成按钮 -->
    <div class="bottom-fixed">
      <van-button 
        class="submit-action" 
        :class="canSubmit ? 'is-blue' : 'is-gray'"
        round 
        block 
        type="primary" 
        @click="submitTask" 
        :loading="loading"
        :disabled="!canSubmit"
      >
        立即生成 AI 试穿图
      </van-button>
    </div>

    <!-- 隐藏的文件输入 -->
    <input 
      ref="personFileInput" 
      type="file" 
      accept="image/*" 
      style="display: none" 
      @change="onPersonFileSelected"
    />
    <input 
      ref="garmentFileInput" 
      type="file" 
      accept="image/*" 
      style="display: none" 
      @change="onGarmentFileSelected"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import request from '../utils/request';
import { showToast, showFailToast } from 'vant';

const router = useRouter();
const personFileInput = ref(null);
const garmentFileInput = ref(null);
const personUrl = ref('');
const selectedGarments = ref([]);
const selectedScene = ref('');
const loading = ref(false);

// 试穿场景数据
const scenes = ref([
  { id: 'workplace', name: '职场', icon: '💼', promptEN: 'Professional business meeting, business attire, clean lighting' },
  { id: 'urban', name: '都市', icon: '🏙️', promptEN: 'Urban street style, city life, casual chic fashion' },
  { id: 'restaurant', name: '餐厅', icon: '🍽️', promptEN: 'Elegant dinner setting, restaurant ambiance, fine dining outfit' },
  { id: 'party', name: '派对', icon: '🎉', promptEN: 'Party atmosphere, celebratory mood, glamorous dressing' },
  { id: 'beach', name: '海边', icon: '🏖️', promptEN: 'Beach scene, vacation mood, beachy attire and accessories' },
  { id: 'desert', name: '沙漠', icon: '🏜️', promptEN: 'Desert landscape, bohemian style, earthy tones' },
  { id: 'camping', name: '露营', icon: '🏕️', promptEN: 'Camping outdoor environment, nature travel, outdoor gear' },
  { id: 'sports', name: '运动', icon: '⚽', promptEN: 'Sports casual, active lifestyle, athletic wear' }
]);

const canSubmit = computed(() => personUrl.value && selectedGarments.value.length > 0);

const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await request.post('/v1/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.url;
};

const onPersonFileSelected = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const url = await uploadFile(file);
    personUrl.value = url;
    showToast({ message: '上传成功', type: 'success' });
  } catch (err) {
    showFailToast('上传失败');
  }
};

const onGarmentFileSelected = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const url = await uploadFile(file);
    selectedGarments.value.push({
      id: null,
      image_url: url,
      isCustom: true
    });
    showToast({ message: '上传成功', type: 'success' });
  } catch (err) {
    showFailToast('上传失败');
  }
};

const selectPersonImage = () => {
  personFileInput.value?.click();
};

const uploadGarmentPhoto = () => {
  garmentFileInput.value?.click();
};

const goToGallery = () => {
  router.push('/gallery');
};

const goToHistory = () => {
  router.push('/tasks');
};

const removeGarment = (index) => {
  selectedGarments.value.splice(index, 1);
};

const toggleScene = (sceneId) => {
  if (selectedScene.value === sceneId) {
    selectedScene.value = '';
  } else {
    selectedScene.value = sceneId;
  }
};

// 提取图片URL的辅助函数
const extractImageUrl = (item) => {
  if (!item) return '';
  
  // 处理来自自拍上传的情况（有image_url字段）
  if (item.image_url) return item.image_url;
  
  // 处理来自Gallery的情况（有image_urls字段）
  const imageUrls = item.image_urls;
  if (!imageUrls) return '';
  if (typeof imageUrls === 'string') return imageUrls;
  if (typeof imageUrls === 'object') {
    return imageUrls.main || imageUrls.urls?.[0] || Object.values(imageUrls)[0] || '';
  }
  return '';
};

// 从Gallery返回时加载选择的商品
onMounted(() => {
  // 检查是否需要恢复之前失败任务的人物图片
  const personImageForRegen = sessionStorage.getItem('person_image_for_regenerate');
  if (personImageForRegen) {
    personUrl.value = personImageForRegen;
    sessionStorage.removeItem('person_image_for_regenerate');
    showToast({ message: '已加载人物照片，请重新选择衣物', type: 'success' });
  }

  // 检查是否从Gallery返回，加载选择的商品
  const savedGarments = sessionStorage.getItem('selected_garments');
  if (savedGarments) {
    try {
      const garments = JSON.parse(savedGarments);
      selectedGarments.value = garments;
      sessionStorage.removeItem('selected_garments');
      showToast({ message: `已添加 ${garments.length} 件商品`, type: 'success' });
    } catch (e) {
      console.error('Failed to parse selected garments', e);
    }
  }
});

const submitTask = async () => {
  if (!canSubmit.value) return;
  loading.value = true;
  try {
    const params = new URLSearchParams();
    // 如果选了场景，用场景提示词替代默认提示词
    let prompt = 'High quality, photorealistic, fashion style';
    if (selectedScene.value) {
      const sceneObj = scenes.value.find(s => s.id === selectedScene.value);
      if (sceneObj) {
        prompt = sceneObj.promptEN;
      }
    }
    params.append('prompt', prompt);
    params.append('person_urls', JSON.stringify([personUrl.value]));
    
    // 只用第一个衣物
    const garment = selectedGarments.value[0];
    const garmentImageUrl = garment.image_url || extractImageUrl(garment.image_urls);
    
    if (garment.isCustom) {
      // 自拍上传的衣物
      params.append('garment_urls', JSON.stringify([garmentImageUrl]));
    } else if (garment.id) {
      // 来自Gallery选择的系统商品
      if (garmentImageUrl) {
        params.append('garment_urls', JSON.stringify([garmentImageUrl]));
      } else {
        params.append('garment_id', String(garment.id));
      }
    } else {
      // 直接上传的自拍衣物
      params.append('garment_urls', JSON.stringify([garmentImageUrl]));
    }

    const res = await request.post('/v1/tasks/try-on', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    if (res.task_id) {
      // 保存到本地历史，包括衣物信息供重新生成时使用
      const localTasks = JSON.parse(localStorage.getItem('my_tasks') || '[]');
      localTasks.unshift({
        id: res.task_id,
        status: 'pending',
        createdAt: new Date().toISOString(),
        customerImage: personUrl.value,
        garmentId: garment.id || null,
        garmentUrl: garment.isCustom ? garmentImageUrl : null,
        prompt: 'High quality, photorealistic, fashion style'
      });
      localStorage.setItem('my_tasks', JSON.stringify(localTasks));
      
      showToast({ message: '提交成功，正在生成...', type: 'success' });
      setTimeout(() => {
        router.push('/tasks');
      }, 500);
    }
  } catch (err) {
    console.error('Submit error:', err);
    showFailToast('提交失败，请重试');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.upload-page {
  padding-top: 20px;
  padding-bottom: 100px;
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF5F7 0%, #FFF8E1 50%, #E3F2FD 100%);
}

/* 顶部卡片 */
.page-header {
  width: calc(100% - 40px);
  max-width: 660px;
  height: 110px;
  margin: 0 auto 24px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 20px;
  box-sizing: border-box;
}

.header-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 40px;
}

.header-left {
  flex: 1;
}

.title-bold {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin: 0 0 4px 0;
}

.title-tip {
  font-size: 12px;
  color: #999;
  margin: 0;
  font-weight: 400;
}

/* 主要卡片 */
.main-card {
  width: calc(100% - 40px);
  max-width: 660px;
  margin: 20px auto 20px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
}

.main-card:first-of-type {
  margin-top: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
}

.badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

/* 上传框 */
.upload-wrapper {
  display: flex;
  justify-content: center;
}

.mini-upload-box {
  width: 140px;
  height: 140px;
  border-radius: 14px;
  background: #f8f8f8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  border: 2px dashed #ddd;
}

.mini-upload-box:hover {
  border-color: #667eea;
  background: #f5f5ff;
}

.img-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 100%;
}

.camera-icon {
  font-size: 32px;
}

.plus-text {
  font-size: 12px;
  color: #999;
  font-weight: 500;
}

.change-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  text-align: center;
  padding: 8px;
  font-size: 12px;
}

/* 网格按钮 */
.btn-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: #f9f9ff;
  cursor: pointer;
  transition: all 0.2s;
}

.grid-item:hover {
  background: #f5f5ff;
}

.grid-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: white;
  border: 2px solid #ddd;
}

.grid-item > text {
  font-size: 12px;
  color: #333;
  font-weight: 500;
}

/* 已选预览 */
.selected-preview {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.preview-title {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
  font-weight: 500;
}

.thumb-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.thumb-list {
  display: flex;
  gap: 12px;
}

.thumb-item {
  position: relative;
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-icon {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  font-weight: bold;
}

/* 底部按钮 */
.bottom-fixed {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, transparent 0%, white 20%);
  z-index: 100;
}

.submit-action {
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.submit-action.is-gray {
  background: #ddd !important;
  color: #999 !important;
  border: none;
  cursor: not-allowed !important;
}

.submit-action.is-blue {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.submit-action {
  height: 44px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

:deep(.van-button) {
  border-radius: 24px;
}

/* 历史入口样式 */
.history-area {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-direction: row-reverse;
  gap: 4px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.history-area:hover {
  opacity: 0.7;
}

.history-badge {
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.history-icon {
  font-size: 18px;
}

.history-label {
  font-size: 10px;
  color: #666;
  text-align: right;
  line-height: 1.2;
  font-weight: 500;
  word-break: keep-all;
}

/* 场景选择样式 */
.scene-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.scene-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.scene-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  border-radius: 10px;
  background: #f9f9ff;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.scene-item:hover {
  background: #f5f5ff;
}

.scene-item.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
}

.scene-icon {
  font-size: 28px;
  line-height: 1;
}

.scene-name {
  font-size: 12px;
  color: #333;
  font-weight: 500;
  text-align: center;
}

.scene-item.active .scene-name {
  color: #667eea;
  font-weight: 600;
}
</style>
