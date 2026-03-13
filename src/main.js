import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import 'vant/lib/index.css';
import { Button, Field, CellGroup, Form, Toast, Dialog, Tabbar, TabbarItem, NavBar, Loading, Image as VanImage, Uploader } from 'vant';

const app = createApp(App)

app.use(router)

// Global registration of common Vant components
app.use(Button)
app.use(Field)
app.use(CellGroup)
app.use(Form)
app.use(Toast)
app.use(Dialog)
app.use(Tabbar)
app.use(TabbarItem)
app.use(NavBar)
app.use(Loading)
app.use(VanImage)
app.use(Uploader)

app.mount('#app')
