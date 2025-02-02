<script setup>
import { ref, onMounted } from 'vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import api from '@/api/axiosinterceptor';

import { useAlert } from '@/utils/useAlert';
import AlertComponent from '@/components/shared/AlertComponent.vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';

const page = ref({ title: '목표 매출 관리' });
const breadcrumbs = ref([
    {
        text: '관리자',
        disabled: false,
        href: '#'
    },
    {
        text: '목표 매출  관리',
        disabled: true,
        href: '#'
    }
]);

const { alertMessage, alertType, showAlert, triggerAlert } = useAlert();

const searchYear = ref('');
const searchSalesperson = ref('');
const targetSales = ref([]);
const canAddTargetSale = ref(false);
const userNames = ref([]);
const productNames = ref([]);
const formValid = ref(false);
const isEditMode = ref(false);

const currentYear = new Date().getFullYear();
const yearRange = ref([]);
for (let i = currentYear - 2; i <= currentYear + 2; i++) {
  yearRange.value.push(i);
}

const headers = ref([
  { title: '제품 이름', align: 'start', sortable: false, key: 'prodName' },
  { title: '합계', key: 'sum' },
  { title: '01월', key: 'month01' },
  { title: '02월', key: 'month02' },
  { title: '03월', key: 'month03' },
  { title: '04월', key: 'month04' },
  { title: '05월', key: 'month05' },
  { title: '06월', key: 'month06' },
  { title: '07월', key: 'month07' },
  { title: '08월', key: 'month08' },
  { title: '09월', key: 'month09' },
  { title: '10월', key: 'month10' },
  { title: '11월', key: 'month11' },
  { title: '12월', key: 'month12' },
  { title: '액션', align: 'start' },
]);

function groupDataByProduct(data) {
  const groupedData = [];
  data.forEach(item => {
    let existingProduct = groupedData.find(prod => prod.prodName === item.prodName);
    if (!existingProduct) {
      existingProduct = {
        prodName: item.prodName,
        month01: '', month02: '', month03: '', month04: '',
        month05: '', month06: '', month07: '', month08: '',
        month09: '', month10: '', month11: '', month12: '',
        sum: 0,
        isEditing: false
      };
      groupedData.push(existingProduct);
    }
    const monthKey = `month${String(item.month).padStart(2, '0')}`;
    existingProduct[monthKey] = item.monthTarget;
    existingProduct.sum += item.monthTarget;
  });
  return groupedData;
}

async function fetchUsers() {
  try {
    const response = await api.get('/users');
    userNames.value = response.data.result.map(user => user.userName);
  } catch (error) {
    console.error('Error:', error.message || error);
  }
}

async function fetchProducts() {
  try {
    const response = await api.get('/admin/products');
    productNames.value = response.data.result.map(product => product.name);
  } catch (error) {
    console.error('Error:', error.message || error);
  }
}

async function fetchTargetSales() {
  try {
    const response = await api.get(`/admin/targetsales/${searchSalesperson.value}`, {
      params: {
        year: searchYear.value,
      },
    });

    if (response.data.code === 200) {
      if (Array.isArray(response.data.result)) {
        targetSales.value = groupDataByProduct(response.data.result);
        canAddTargetSale.value = true;
      }
    } else {
      canAddTargetSale.value = false;
      
      triggerAlert('년도와 영업사원을 선택해주세요.', 'warning', 2000);

      targetSales.value = [];
      canAddTargetSale.value = false;
    }
  } catch (error) {
    console.error('Error adding target sale:', error.message || error);
  }
}

const dialog = ref(false);
const newTargetSale = ref({
  userName: '',
  prodName: '',
  sum: 0,
  year: '',
  monthTargets: Array(12).fill(0),
})

function openDialog() {
  newTargetSale.value.userName = searchSalesperson.value;
  newTargetSale.value.year = searchYear.value;
  isEditMode.value = false;
  dialog.value = true;
}

async function saveTargetSale() {
  validateForm();
  if (!formValid.value) return;
  try {
    const response = await api.post('/admin/targetsales', newTargetSale.value);
    dialog.value = false;
    fetchTargetSales();
    closeDialog();
    console.log(response);
    triggerAlert('목표매출이 등록되었습니다.', 'success', 2000);
  } catch (error) {
    triggerAlert('목표매출 등록에 실패했습니다.', 'error', 2000);
  }
}

function editTargetSale(item) {
  newTargetSale.value = {
    userName: searchSalesperson.value,
    prodName: item.prodName,
    sum: item.sum,
    year: searchYear.value,
    monthTargets: [
      item.month01,
      item.month02,
      item.month03,
      item.month04,
      item.month05,
      item.month06,
      item.month07,
      item.month08,
      item.month09,
      item.month10,
      item.month11,
      item.month12,
    ],
  };
  isEditMode.value = true;
  dialog.value = true;
}

function closeDialog() {
  dialog.value = false;
  newTargetSale.value = {
    userName: '',
    prodName: '',
    sum: 0,
    year: '',
    monthTargets: Array(12).fill(0),
  };
}

function validateForm() {
  formValid.value = !!newTargetSale.value.prodName;
}

const search = () => {
  fetchTargetSales();
};

function formatNumber(value) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

onMounted(() => {
  fetchUsers();
  fetchProducts();
});
</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs"></BaseBreadcrumb>
  <AlertComponent :show="showAlert" :message="alertMessage" :type="alertType" />
  <v-row>
    <v-col cols="12">
      <UiParentCard title="목표 매출 관리">
        <v-row class="mb-5">
          <v-col cols="4" sm="4">
            <v-select
              label="년도 선택"
              v-model="searchYear"
              :items="yearRange"
              hide-details
            ></v-select>
          </v-col>
          <v-col cols="4" sm="4">
            <v-select
              v-model="searchSalesperson"
              :items="userNames"
              label="영업사원 선택"
            ></v-select>
          </v-col>
          <v-col cols="4">
            <v-btn color="primary" @click="search">검색</v-btn>
          </v-col>
          <v-col cols="12">
                <p style = "font-weight: bold;">검색 결과: {{ targetSales.length }}건, 금액(원)</p>
          </v-col>
        </v-row>

        <v-data-table
          class="border rounded-md" 
          :headers="headers"
          :items="targetSales">
          <template v-slot:item="{ item }">
            <tr>
              <td>{{ item.prodName }}</td>
              <td>{{ formatNumber(item.sum) }}</td>
              <td>{{ formatNumber(item.month01) }}</td>
              <td>{{ formatNumber(item.month02) }}</td>
              <td>{{ formatNumber(item.month03) }}</td>
              <td>{{ formatNumber(item.month04) }}</td>
              <td>{{ formatNumber(item.month05) }}</td>
              <td>{{ formatNumber(item.month06) }}</td>
              <td>{{ formatNumber(item.month07) }}</td>
              <td>{{ formatNumber(item.month08) }}</td>
              <td>{{ formatNumber(item.month09) }}</td>
              <td>{{ formatNumber(item.month10) }}</td>
              <td>{{ formatNumber(item.month11) }}</td>
              <td>{{ formatNumber(item.month12) }}</td>
              <td>
                <EditIcon
                    height="20"
                    width="20"
                    class="mr-2 text-primary cursor-pointer"
                    size="small"
                    @click.stop="editTargetSale(item)"
                />
              </td>
            </tr>
          </template>
          <template v-slot:top>
            <v-toolbar class="bg-lightsecondary" flat>
              <v-toolbar-title>목표 매출</v-toolbar-title>
              <v-spacer></v-spacer>
              <v-btn 
                class="mr-3"
                v-if="canAddTargetSale" 
                color="primary" 
                variant="tonal" 
                dark 
                @click.stop="openDialog">
                목표 매출 생성
              </v-btn>
            </v-toolbar>
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>

  <v-dialog v-model="dialog" max-width="600px">
    <v-card>
      <v-card-title>{{ isEditMode ? '목표매출 수정' : '목표매출 등록' }}</v-card-title>
      <v-card-text>
        <v-container>
          <v-form v-model="formValid">
            <v-row>
              <v-col cols="12">
                <v-select
                  v-model="newTargetSale.prodName"
                  :items="productNames"
                  label="제품 이름"
                  :rules="[v => !!v || '상품명은 필수 입력입니다.']"
                ></v-select>
              </v-col>
              <v-col cols="12">
                <v-text-field 
                  v-model="newTargetSale.sum" 
                  label="합계" 
                  type="number" 
                  :rules="[v => v > 0 || '합계는 0이 될 수 없습니다.']"
                  @blur="newTargetSale.sum = parseInt(newTargetSale.sum) || 0"
                />
              </v-col>
              <v-col cols="4" v-for="(month, index) in 12" :key="index">
                <v-text-field v-model="newTargetSale.monthTargets[index]" :label="`${index + 1}월`" type="number" />
              </v-col>
            </v-row>
          </v-form>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" flat style="font-size: 15px; font-weight: 600;" @click="saveTargetSale()" :disabled="!formValid">저장</v-btn>
        <v-btn color="close" flat style="font-size: 15px; font-weight: 600;" @click="closeDialog">닫기</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
