<script>
import { defineComponent, watch } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import TodoModal from '@/components/modal/TodoModal.vue';
import PlanModal from '@/components/modal/PlanModal.vue';
import './calendar.css';
import { useCalendarStore } from '@/stores/apps/calendar/calendar';
import api from '@/api/axiosinterceptor';
import { reverseActStatus, actStatus } from '@/utils/ActStatusMappings';
import {categoryMapping, reversePlanCls} from '@/utils/PlanMappings'
import axios from 'axios';

export default defineComponent({
  components: {
    FullCalendar,
    TodoModal,
    PlanModal,
  },
  data() {
    return {
      AddTodoModal: false,
      AddPlanModal: false,
      selectedOption: null,
      showSuccessAlert: false,
      alertMessage: '',
      alertType: '',
      items: ['할 일', '영업활동', '일정'],
      showAlert: false,
      statusOptions: ['TODO', 'INPROGRESS', 'DONE'],
      priorityOptions: ['높음', '중간', '낮음'],
      planClsOptions: ['개인', '전사', '제안', '견적','매출', '계약'],
      todo: {
        calendarNo: null,
        title: '',
        todoCls: '',
        priority: '',
        dueDate: '',
        status: '',
        privateYn: 'Y',
        content: '',
      },
      plan: {
        calendarNo: null,
        title: '',
        planCls: '',
        planDate: '',
        startTime: '',
        endTime: '',
        personalYn: 'Y',
        content: '',
        planDetails : {
          title: '',
          note: '',
        },
      },
      calendarOptions: {
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        },
        initialView: 'dayGridMonth',
        editable: true,
        selectable: false,
        selectMirror: true,
        dayMaxEvents: true,
        weekends: true,
        select: this.handleDateSelect,
        eventClick: this.handleEventClick,
        eventsSet: this.handleEvents,
      },
      currentEvents: [],
    };
  },
  created() {
    this.checkCalendarExists();
    const store = useCalendarStore();
    
    watch(() => store.filteredData, (newEvents) => {
      this.applyFilter(newEvents);
    }, { deep: true });
  },

  methods: {
    async checkCalendarExists(){
      try{
        const response = await api.get('/calendars/user/exists');
        console.log(response);
        if(response.data.result){ // 캘린더 fetch
          await this.fetchCalendarData();
        }else{ // 캘린더 create
          await this.createCalendar();
        }   
      }catch(e){
        console.log(e);
      }
    },

    // 새로운 캘린더 생성
    async createCalendar() {
      try {
        const response = await api.post('/calendars');
        console.log("캘린더 생성")
        console.log(response);
      } catch (e) {
        console.error(e);
      }
    },

    // 필터
    applyFilter(filteredEvents) {
      const calendarApi = this.$refs.calendar.getApi();
      calendarApi.removeAllEvents();

      filteredEvents.forEach(event => {
        const category = this.mapPlanClsToCategory(event.planCls);
        calendarApi.addEvent({
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          allDay: event.allDay,
          classNames: [event.category + '-event'],
        });
      });
    },
    
    mapPlanClsToCategory(planCls) {
      return categoryMapping[planCls] || 'plan'; 
    },

    // 조회
    async fetchCalendarData() {
      try {
        const response = await api.get('/calendars/user/data');
        const data = response.data;
        // console.log("캘린더 조회")
        // console.log(response);
        if(data.code== 200){
          const calendarData = response.data.result;
          this.calendarNo = response.data.result.calendarNo;
          const store = useCalendarStore();

          const todos = calendarData.todos.map(todo => ({
          id: todo.todoNo,
          title: todo.title,
          start: todo.dueDate,
          category: 'todo',
          status: todo.status,
          allDay: true,
        }));

        const plans = calendarData.plans.map(plan => ({
          id: plan.planNo,
          title: plan.title,
          start: `${plan.planDate}T${plan.startTime}`,
          end: `${plan.planDate}T${plan.endTime}`,
          category: this.mapPlanClsToCategory(plan.planCls),
          classNames: [`${plan.planCls.toLowerCase()}_plan-event`],
          allDay: false,
        }));

        const acts = calendarData.acts.map(act => ({
          id: act.actNo,
          title: act.name,
          start: `${act.actDate}T${act.startTime}`,
          end: `${act.actDate}T${act.endTime}`,
          category: 'act',
          allDay: false,
          classNames: ['act-event'],
        }));
        store.setCalendarData([...todos, ...plans, ...acts]);
        this.applyFilter(store.filteredData);

        }else{
          alert(data.message);
        }

      } catch (e) {
        console.error(e);
      }
    }, 
    // 추가
    async addTodo() {
      if (!this.todo.title || !this.todo.todoCls || !this.todo.priority || !this.todo.dueDate || !this.todo.status) {
        this.showAlert = true;
        setTimeout(() => {
          this.showAlert = false;
        }, 2000);
        return;
      }

      this.mode = 'add';
      this.showAlert = false;
      const setPrivateYn = {
        ...this.todo,
        calendarNo: this.calendarNo,
        privateYn: this.todo.privateYn ? 'Y' : 'N',
      };

      try {
        const response = await api.post('/todos', setPrivateYn);
        const createdTodo = response.data.result;
        const calendarApi = this.$refs.calendar.getApi();
        calendarApi.addEvent({
          id: createdTodo.todoNo,
          title: createdTodo.title,
          start: createdTodo.dueDate,
          allDay: true,
          classNames: ['todo-event'],
        });
        this.closeTodoModal();
        await this.fetchCalendarData();
      } catch (e) {
        console.error(e);
      }
    },
    async addPlan(plan) {
      if (!plan.planCls || !plan.planDate) {
        this.showAlert = true;
        setTimeout(() => {
          this.showAlert = false;
        }, 2000);
        return;
      }
      this.mode = 'add';
      this.showAlert = false;
      const setPersonalYn = {
        ...plan,
        calendarNo: this.calendarNo,
        personalYn: plan.personalYn ? 'Y' : 'N',
      };
      try {
        const response = await api.post('/plans', setPersonalYn);
        const createdPlan = response.data.result;
        const calendarApi = this.$refs.calendar.getApi();
        const className = `${plan.planCls.toLowerCase()}_plan-event`;
    
        calendarApi.addEvent({
          id: createdPlan.planNo,
          title: createdPlan.title,
          start: createdPlan.planDate + 'T' + createdPlan.startTime,
          end: createdPlan.planDate + 'T' + createdPlan.endTime,
          allDay: false,
          classNames: [className], 
        });
        this.closePlanModal();
        await this.fetchCalendarData();
    } catch (e) {
      console.error(e);
    }
  },
  
  // 수정
  async updateTodo(updatedTodo) {
    const calendarApi = this.$refs.calendar.getApi();
    const event = calendarApi.getEventById(updatedTodo.todoNo);

    if (event) {
      event.setProp('title', updatedTodo.title);
      event.setStart(updatedTodo.dueDate);
      event.setExtendedProp('todoCls', updatedTodo.todoCls);
      event.setExtendedProp('priority', updatedTodo.priority);
      event.setExtendedProp('status', updatedTodo.status);
      }
    },

  async updatePlan(updatedPlan) {
    const calendarApi = this.$refs.calendar.getApi();
    const event = calendarApi.getEventById(updatedPlan.planNo);

    if (event) {
      event.setProp('title', updatedPlan.title);
      event.setStart(updatedPlan.dueDate);
      event.setExtendedProp('planCls', updatedPlan.planCls);
      }
    },
  
  // 닫기 및 초기화
    closeTodoModal() {
      this.AddTodoModal = false;
      this.selectedOption = null;
      setTimeout(() => {
        this.clearTodoForm();
      }, 300);
    },
    closePlanModal() {
      this.AddPlanModal = false;
      this.selectedOption = null;
      setTimeout(() => {
        this.clearPlanForm();
      }, 300);
    },
    clearTodoForm() {
      this.mode = 'add';
      this.todo = {
        calendarNo: this.calendarNo,
        title: '',
        todoCls: '',
        priority: '',
        dueDate: '',
        status: '',
        privateYn: 'N',
        content: '',
      };
    },
    clearPlanForm() {
      this.mode = 'add';
      this.plan = {
        calendarNo: this.calendarNo,
        title: '',
        planCls: '',
        planDate: '',
        startTime: '',
        endTime: '',
        personalYn: 'N',
        content: '',
      };
      this.planDetails = {
        title: '',
        note: '',
      };
      this.isPersonal = false;
    },
  // 클릭 이벤트
    handleDateSelect(selectInfo) {
      this.AddTodoModal = true;
      this.AddPlanModal = true;
      this.todo.dueDate = selectInfo.startStr;
      this.plan.planDate = selectInfo.startStr;
    },
    async handleEventClick(clickInfo) {
      const eventId = clickInfo.event.id;    
      const eventClassNames = clickInfo.event.classNames;
      if (eventClassNames.some(className => className.includes('plan'))) {
        this.AddPlanModal = true;
        this.mode = 'edit';
        try {        
          const response = await api.get(`/plans/${eventId}`);  
          const planDetails = response.data.result;
          this.plan = {     
            planNo: planDetails.planNo,
            calendarNo: planDetails.calendarNo,
            title: planDetails.title,
            planCls: reversePlanCls[planDetails.planCls],
            planDate: planDetails.planDate,          
            startTime: planDetails.startTime,          
            endTime: planDetails.endTime,
            personalYn: planDetails.personalYn,     
            content: planDetails.content,
          };
          this.DetailPlanShow = false;
        } catch (e) {        
            console.error(e);      
          }
      } 
      else if (eventClassNames.includes('todo-event')) {
        this.AddTodoModal = true;
        this.mode = 'edit'; 
        try {        
          const response = await api.get(`/todos/${eventId}`);
          const todoDetails = response.data.result;

          this.todo = {
            todoNo: todoDetails.todoNo,
            calendarNo: todoDetails.calendarNo,
            title: todoDetails.title,
            todoCls: todoDetails.todoCls,
            priority: todoDetails.priority,
            dueDate: todoDetails.dueDate,
            status: todoDetails.status,
            privateYn: todoDetails.privateYn,
            content: todoDetails.content,
          };
          this.DetailTodoShow = false;
        } catch (e) {        
          console.error(e);      
        }
      }
      else if (eventClassNames.includes('act-event')) {
        const response = await api.get(`/acts/${eventId}`);
        const actDetails = response.data.result;
        const convertCls = reverseActStatus[actDetails.cls] || actDetails.cls;
        const actNo = actDetails.actNo;

        this.$router.push({
          name: 'FormCustom',
          params: { actNo },
          query: { cls: convertCls }
        });
      }
    },
    handleEvents(events) {
      this.currentEvents = events;
    },
    handleAlert(alertData) {
      this.alertMessage = alertData.message;
      this.alertType = alertData.type;
      setTimeout(() => {
        this.showSuccessAlert = true;
      },500);
      setTimeout(() => {
        this.showSuccessAlert = false;
      }, 3000);
    },
    async deleteTodo(todoToDelete) {
      try {
        await api.delete(`/todos/${todoToDelete.todoNo}`);
        const calendarApi = this.$refs.calendar.getApi();
        
        const event = calendarApi.getEventById(todoToDelete.todoNo);
        if (event) {
          event.remove();
        }
        this.closeTodoModal();
        this.handleAlert({
          message: '할 일이 삭제되었습니다.',
          type: 'success',
        });
      } catch (e) {
        console.error(e);
      }
    },
    async deletePlan(planToDelete) {
      try {
        await api.delete(`/plans/${planToDelete.planNo}`);
        const calendarApi = this.$refs.calendar.getApi();
        
        const event = calendarApi.getEventById(planToDelete.planNo);
        if (event) {
          event.remove();
        }
        this.closePlanModal();
        this.handleAlert({
          message: '일정이 삭제되었습니다.',
          type: 'success',
        });
      } catch (e) {
        console.error(e);
      }
    },
  },
  watch: {
    selectedOption(value) {
      if (value === '할 일') {
        this.AddTodoModal = true;
      } else if (value === '영업활동') {
        this.$router.push('/apps/act');
      } else if (value === '일정') {
        this.AddPlanModal = true;
      }
    },
  },
});

</script>

<template>
  <div class='demo-app'>
    <div class='demo-app-main'>
        <v-select
        v-model="selectedOption"
        :items="items"
        label="생성"
        hide-details
        outlined
        class="select-item"
      ></v-select>

      <FullCalendar ref="calendar" class='demo-app-calendar rounded-md':options="calendarOptions">
        <template v-slot:eventContent="arg">
          <div class="text-subtitle-1 pa-1 text-truncate">{{ arg.event.title }}</div>
        </template>
      </FullCalendar>

      <TodoModal v-model="AddTodoModal"
        :todo="todo" :priorityOptions="priorityOptions" :statusOptions="statusOptions" :mode="mode"
        @close="closeTodoModal" @add="addTodo" @delete="deleteTodo" @update="updateTodo" @show-alert="handleAlert"
      />
      <PlanModal v-model="AddPlanModal" 
      :plan="plan" :planClsOptions="planClsOptions" :statusOptions="statusOptions" :mode="mode"
      @close="closePlanModal" @add="addPlan" @delete="deletePlan" @update="updatePlan" @show-alert="handleAlert"/>

      <v-alert v-if="showSuccessAlert" type="success" variant="tonal" :class="['alert', alertType]">
        <h5 class="text-h5 text-capitalize">Success</h5>
          {{ alertMessage }}
      </v-alert>
    </div>
  </div>
</template>
<style>

.calendar-container {
  position: relative;
}

.select-item {
  margin-bottom: 20px;
  width: 200px;
}

.warn-alert {
	position: fixed;
	bottom: 10%; 
	left: 50%;
	transform: translateX(-50%);
	z-index: 3000;
	width: 100%;
}

.alert {
  position: fixed;
  top: 20%;
  left: 90%;
  transform: translateX(-50%);
  z-index: 3000;
  width: 100%;
  max-width: 14%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  font-size: 16px;
}
</style>