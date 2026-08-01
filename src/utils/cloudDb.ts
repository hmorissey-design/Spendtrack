import { 
  db, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  writeBatch 
} from '../firebase';
import { Expense, Category, MonthlyBudget } from '../types';
import { LocalDb } from './db';

export const CloudDb = {
  /**
   * Syncs current local storage data into Firestore for the current user
   */
  async uploadLocalDataToCloud(userId: string): Promise<void> {
    if (!userId) return;

    try {
      const expenses = LocalDb.getExpenses();
      const categories = LocalDb.getCategoriesOnly();
      const budgets = LocalDb.getBudgets();
      const incomeStreams = JSON.parse(localStorage.getItem('expensetrack_income_streams') || '[]');
      const fixedExpenses = JSON.parse(localStorage.getItem('expensetrack_fixed_expenses') || '[]');
      const savingsGoals = JSON.parse(localStorage.getItem('expensetrack_savings_goals') || '[]');
      const currencySymbol = LocalDb.getCurrencySymbol();
      const defaultCategoryId = LocalDb.getDefaultCategoryId();
      const lastReconciliationMonth = localStorage.getItem('last_reconciliation_month') || '';

      // 1. User profile doc
      await setDoc(doc(db, 'userProfiles', userId), {
        userId,
        currencySymbol,
        defaultCategoryId,
        lastReconciliationMonth,
        updatedAt: Date.now()
      }, { merge: true });

      // 2. Upload Expenses
      const expBatch = writeBatch(db);
      for (const exp of expenses) {
        expBatch.set(doc(db, 'expenses', exp.id), {
          ...exp,
          userId
        }, { merge: true });
      }
      await expBatch.commit();

      // 3. Upload Categories
      const catBatch = writeBatch(db);
      for (const cat of categories) {
        catBatch.set(doc(db, 'categories', cat.id), {
          ...cat,
          userId
        }, { merge: true });
      }
      await catBatch.commit();

      // 4. Upload Budgets
      const budBatch = writeBatch(db);
      for (const bud of budgets) {
        const docId = `bud_${bud.month}`;
        budBatch.set(doc(db, 'budgets', docId), {
          ...bud,
          id: docId,
          userId
        }, { merge: true });
      }
      await budBatch.commit();

      // 5. Upload Income Streams
      const incBatch = writeBatch(db);
      for (const inc of incomeStreams) {
        incBatch.set(doc(db, 'incomeStreams', inc.id), {
          ...inc,
          userId
        }, { merge: true });
      }
      await incBatch.commit();

      // 6. Upload Fixed Expenses
      const fixBatch = writeBatch(db);
      for (const fix of fixedExpenses) {
        fixBatch.set(doc(db, 'fixedExpenses', fix.id), {
          ...fix,
          userId
        }, { merge: true });
      }
      await fixBatch.commit();

      // 7. Upload Savings Goals
      const savBatch = writeBatch(db);
      for (const sav of savingsGoals) {
        savBatch.set(doc(db, 'savingsGoals', sav.id), {
          ...sav,
          userId
        }, { merge: true });
      }
      await savBatch.commit();

      console.log('Local data successfully uploaded & synced to Firestore');
    } catch (error) {
      console.error('Error uploading local data to cloud:', error);
    }
  },

  /**
   * Downloads user data from Firestore and populates LocalStorage & local cache
   */
  async downloadCloudDataToLocal(userId: string): Promise<boolean> {
    if (!userId) return false;

    try {
      // 1. Fetch user profile
      const profileSnap = await getDoc(doc(db, 'userProfiles', userId));
      if (profileSnap.exists()) {
        const pData = profileSnap.data();
        if (pData.currencySymbol) LocalDb.setCurrencySymbol(pData.currencySymbol);
        if (pData.defaultCategoryId) LocalDb.setDefaultCategoryId(pData.defaultCategoryId);
        if (pData.lastReconciliationMonth) localStorage.setItem('last_reconciliation_month', pData.lastReconciliationMonth);
      }

      // 2. Fetch Expenses
      const expQuery = query(collection(db, 'expenses'), where('userId', '==', userId));
      const expSnap = await getDocs(expQuery);
      if (!expSnap.empty) {
        const expenses: Expense[] = [];
        expSnap.forEach(d => {
          const data = d.data();
          expenses.push({
            id: data.id || d.id,
            amount: Number(data.amount) || 0,
            category: data.category || 'cat_uncategorized',
            date: data.date || '',
            note: data.note || data.title || '',
            paymentMethod: data.paymentMethod || 'card',
            createdAt: data.createdAt || Date.now()
          });
        });
        expenses.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        localStorage.setItem('personal_finance_app_expenses', JSON.stringify(expenses));
      }

      // 3. Fetch Categories
      const catQuery = query(collection(db, 'categories'), where('userId', '==', userId));
      const catSnap = await getDocs(catQuery);
      if (!catSnap.empty) {
        const categories: Category[] = [];
        catSnap.forEach(d => {
          const data = d.data();
          categories.push({
            id: data.id || d.id,
            name: data.name || '',
            icon: data.icon || 'Tag',
            color: data.color || '',
            textColor: data.textColor || '',
            isDefault: !!data.isDefault,
            limit: Number(data.limit) || 0,
            isHidden: !!data.isHidden
          });
        });
        localStorage.setItem('personal_finance_app_categories', JSON.stringify(categories));
      }

      // 4. Fetch Budgets
      const budQuery = query(collection(db, 'budgets'), where('userId', '==', userId));
      const budSnap = await getDocs(budQuery);
      if (!budSnap.empty) {
        const budgets: MonthlyBudget[] = [];
        budSnap.forEach(d => {
          const data = d.data();
          budgets.push({
            month: data.month,
            limitAmount: Number(data.limitAmount) || 0,
            categoryLimits: data.categoryLimits || {}
          });
        });
        localStorage.setItem('personal_finance_app_budget', JSON.stringify(budgets));
      }

      // 5. Fetch Income Streams
      const incQuery = query(collection(db, 'incomeStreams'), where('userId', '==', userId));
      const incSnap = await getDocs(incQuery);
      if (!incSnap.empty) {
        const incomeStreams: any[] = [];
        incSnap.forEach(d => {
          const data = d.data();
          incomeStreams.push({
            id: data.id || d.id,
            label: data.label,
            amount: Number(data.amount) || 0,
            frequency: data.frequency
          });
        });
        localStorage.setItem('expensetrack_income_streams', JSON.stringify(incomeStreams));
      }

      // 6. Fetch Fixed Expenses
      const fixQuery = query(collection(db, 'fixedExpenses'), where('userId', '==', userId));
      const fixSnap = await getDocs(fixQuery);
      if (!fixSnap.empty) {
        const fixedExpenses: any[] = [];
        fixSnap.forEach(d => {
          const data = d.data();
          fixedExpenses.push({
            id: data.id || d.id,
            label: data.label,
            amount: Number(data.amount) || 0,
            dueDate: data.dueDate
          });
        });
        localStorage.setItem('expensetrack_fixed_expenses', JSON.stringify(fixedExpenses));
      }

      // 7. Fetch Savings Goals
      const savQuery = query(collection(db, 'savingsGoals'), where('userId', '==', userId));
      const savSnap = await getDocs(savQuery);
      if (!savSnap.empty) {
        const savingsGoals: any[] = [];
        savSnap.forEach(d => {
          const data = d.data();
          savingsGoals.push({
            id: data.id || d.id,
            label: data.label,
            targetAmount: Number(data.targetAmount) || 0,
            currentAmount: Number(data.currentAmount) || 0,
            allocationPercent: Number(data.allocationPercent) || 0
          });
        });
        localStorage.setItem('expensetrack_savings_goals', JSON.stringify(savingsGoals));
      }

      localStorage.setItem('personal_finance_app_has_init', 'true');
      return true;
    } catch (error) {
      console.error('Error downloading cloud data:', error);
      return false;
    }
  },

  /**
   * Helper to write single items directly to cloud if authenticated
   */
  async saveExpenseToCloud(userId: string, expense: Expense): Promise<void> {
    if (!userId) return;
    try {
      await setDoc(doc(db, 'expenses', expense.id), { ...expense, userId }, { merge: true });
    } catch (e) {
      console.error('Error saving expense to cloud:', e);
    }
  },

  async deleteExpenseFromCloud(userId: string, expenseId: string): Promise<void> {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'expenses', expenseId));
    } catch (e) {
      console.error('Error deleting expense from cloud:', e);
    }
  },

  async saveCategoryToCloud(userId: string, category: Category): Promise<void> {
    if (!userId) return;
    try {
      await setDoc(doc(db, 'categories', category.id), { ...category, userId }, { merge: true });
    } catch (e) {
      console.error('Error saving category to cloud:', e);
    }
  },

  async saveSavingsGoalToCloud(userId: string, goal: any): Promise<void> {
    if (!userId) return;
    try {
      await setDoc(doc(db, 'savingsGoals', goal.id), { ...goal, userId }, { merge: true });
    } catch (e) {
      console.error('Error saving goal to cloud:', e);
    }
  },

  async saveIncomeStreamToCloud(userId: string, stream: any): Promise<void> {
    if (!userId) return;
    try {
      await setDoc(doc(db, 'incomeStreams', stream.id), { ...stream, userId }, { merge: true });
    } catch (e) {
      console.error('Error saving income stream to cloud:', e);
    }
  },

  async saveFixedExpenseToCloud(userId: string, fixedExp: any): Promise<void> {
    if (!userId) return;
    try {
      await setDoc(doc(db, 'fixedExpenses', fixedExp.id), { ...fixedExp, userId }, { merge: true });
    } catch (e) {
      console.error('Error saving fixed expense to cloud:', e);
    }
  }
};
