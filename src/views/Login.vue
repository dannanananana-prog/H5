<template>
  <div class="login-page">
    <div class="login-header">
      <div class="header-emoji">🌵</div>
      <h1 class="app-title">AI 试衣间</h1>
      <p class="app-subtitle">让我们遇见最美的自己</p>
    </div>

    <van-form @submit="onSubmit" class="login-form">
      <van-cell-group inset>
        <van-field
          v-model="phone"
          name="phone"
          label="手机号"
          placeholder="请输入手机号"
          type="tel"
          :rules="[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[0-9]{10}$/, message: '手机号格式不正确' }
          ]"
        />
      </van-cell-group>
      <div class="submit-btn-container">
        <van-button 
          round 
          block 
          type="primary" 
          native-type="submit" 
          :loading="loading"
          size="large"
        >
          进入试衣间
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import request from '../utils/request';
import { showSuccessToast, showFailToast } from 'vant';

const phone = ref('');
const loading = ref(false);
const router = useRouter();

const onSubmit = async () => {
  loading.value = true;
  try {
    const res = await request.post('/v1/auth/login', { phone: phone.value });
    if (res.access_token) {
      localStorage.setItem('token', res.access_token);
      if (res.user && res.user.id) {
        localStorage.setItem('userId', res.user.id);
      }
      showSuccessToast('验证通过');
      setTimeout(() => {
        router.replace('/upload');
      }, 500);
    }
  } catch (error) {
    showFailToast('验证失败，请检查手机号');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF5F7 0%, #FFF8E1 50%, #E3F2FD 100%);
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.login-header {
  text-align: center;
  margin-bottom: 60px;
}

.header-emoji {
  font-size: 80px;
  margin-bottom: 20px;
  display: block;
}

.app-title {
  font-size: 32px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
  letter-spacing: 1px;
}

.app-subtitle {
  font-size: 14px;
  color: #999;
  margin: 0;
  font-weight: 400;
}

.login-form {
  width: 90%;
  max-width: 380px;
}

.submit-btn-container {
  padding: 24px 16px;
}

:deep(.van-cell-group) {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

:deep(.van-field) {
  padding: 16px;
}
</style>
