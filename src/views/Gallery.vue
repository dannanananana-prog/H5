<template>
  <div class="gallery-page">
    <div class="gallery-header">
      <button class="back-btn" @click="goBack">← 返回</button>
      <h2 class="gallery-title">选择搭配单品</h2>
      <div class="selected-count">已选: {{ selectedCount }}</div>
    </div>

    <div class="loading" v-if="loading">
      <div class="spinner"></div>
      <p>加载商品库...</p>
    </div>

    <div class="product-grid" v-else-if="products.length > 0">
      <div 
        v-for="(product, idx) in products" 
        :key="product.id" 
        class="product-card" 
        :class="{ active: product.selected }"
        @click="toggleSelect(idx)"
      >
        <div class="img-wrapper">
          <img 
            :src="product.image_url || '/assets/default.png'" 
            :alt="product.name"
            class="product-img"
          />
          <div v-if="product.selected" class="selected-overlay"></div>
          <div v-if="product.selected" class="select-badge">✓</div>
        </div>
        <div class="product-info">
          <div class="product-name">{{ product.name }}</div>
          <div class="product-category">{{ product.category }}</div>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else>
      <p>商品库暂无数据</p>
    </div>

    <div class="bottom-bar">
      <van-button 
        round 
        block 
        type="primary" 
        @click="confirmSelect" 
        :disabled="selectedCount === 0"
        class="confirm-btn"
      >
        确认选择 ({{ selectedCount }})
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import request from '../utils/request';
import { showToast, showFailToast } from 'vant';

const router = useRouter();
const products = ref([]);
const loading = ref(false);
const selectedCount = ref(0);

const fetchGarments = async () => {
  loading.value = true;
  try {
    const res = await request.get('/v1/garments/');
    if (Array.isArray(res)) {
      products.value = res.map(item => ({
        id: item.id,
        name: item.name || '未命名单品',
        category: Array.isArray(item.categories) ? item.categories[0] : '默认',
        image_url: extractImageUrl(item.image_urls),
        selected: false
      }));
    }
  } catch (err) {
    showFailToast('加载商品库失败');
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const extractImageUrl = (imageUrls) => {
  if (!imageUrls) return '';
  if (typeof imageUrls === 'string') return imageUrls;
  if (typeof imageUrls === 'object') {
    return imageUrls.main || imageUrls.urls?.[0] || Object.values(imageUrls)[0] || '';
  }
  return '';
};

const toggleSelect = (index) => {
  products.value[index].selected = !products.value[index].selected;
  selectedCount.value = products.value.filter(p => p.selected).length;
};

const goBack = () => {
  router.back();
};

const confirmSelect = () => {
  const selected = products.value.filter(p => p.selected);
  // Save to sessionStorage for Upload page to retrieve
  sessionStorage.setItem('selected_garments', JSON.stringify(selected));
  showToast({ message: `已选择 ${selectedCount.value} 件商品`, type: 'success' });
  setTimeout(() => {
    router.back();
  }, 500);
};

onMounted(() => {
  fetchGarments();
});
</script>

<style scoped>
.gallery-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF5F7 0%, #FFF8E1 50%, #E3F2FD 100%);
  padding-bottom: 100px;
}

.gallery-header {
  background: white;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: #333;
  cursor: pointer;
  padding: 8px;
  flex-shrink: 0;
}

.back-btn:hover {
  color: #667eea;
}

.gallery-title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.selected-count {
  font-size: 14px;
  color: #999;
  flex-shrink: 0;
  min-width: 60px;
  text-align: right;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f0f0f0;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  padding: 16px;
  max-width: 1000px;
  margin: 0 auto;
}

.product-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 2px solid transparent;
}

.product-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.product-card.active {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.img-wrapper {
  width: 100%;
  aspect-ratio: 1 / 1;
  position: relative;
  background: #f8f8f8;
  overflow: hidden;
}

.product-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.selected-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(102, 126, 234, 0.2);
  z-index: 1;
}

.select-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  background: #667eea;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  z-index: 2;
}

.product-info {
  padding: 12px;
}

.product-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.product-category {
  font-size: 12px;
  color: #999;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  font-size: 16px;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  background: white;
  border-top: 1px solid #eee;
  z-index: 100;
}

.confirm-btn {
  height: 48px;
  font-size: 16px;
  font-weight: 600;
}

:deep(.van-button--disabled) {
  background: #ddd !important;
  color: #999 !important;
}
</style>
