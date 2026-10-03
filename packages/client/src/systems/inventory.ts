export interface ItemData {
  id: string;
  name: string;
  icon: string;
  type: 'weapon' | 'armor' | 'consumable' | 'quest' | 'flying';
  count: number;
  maxStack: number;
  description: string;
  healHp?: number;
  healMp?: number;
  healFp?: number;
}

export interface InventorySlot {
  slotIndex: number;
  item: ItemData | null;
}

export class InventorySystem {
  public static readonly TOTAL_SLOTS = 42; // FlyFF Classic 42 inventory slots
  private slots: InventorySlot[] = [];
  private onInventoryChangedCallback?: () => void;

  constructor() {
    this.initDefaultInventory();
  }

  private initDefaultInventory(): void {
    for (let i = 0; i < InventorySystem.TOTAL_SLOTS; i++) {
      this.slots.push({ slotIndex: i, item: null });
    }

    // Seed starter FlyFF items
    this.addItem({
      id: 'pot-hp-small',
      name: 'Small Fresh Oyster (HP)',
      icon: '🦪',
      type: 'consumable',
      count: 20,
      maxStack: 99,
      description: 'Restores 50 HP immediately.',
      healHp: 50
    });

    this.addItem({
      id: 'pot-mp-small',
      name: 'Small Blue Pill (MP)',
      icon: '💊',
      type: 'consumable',
      count: 15,
      maxStack: 99,
      description: 'Restores 35 MP immediately.',
      healMp: 35
    });

    this.addItem({
      id: 'pot-fp-small',
      name: 'Small Refresh Candy (FP)',
      icon: '🍬',
      type: 'consumable',
      count: 15,
      maxStack: 99,
      description: 'Restores 35 FP immediately.',
      healFp: 35
    });

    this.addItem({
      id: 'fly-broom-wooden',
      name: 'Clean Broom',
      icon: '🧹',
      type: 'flying',
      count: 1,
      maxStack: 1,
      description: 'Beginner flying broomstick. Requires Level 20 or Flying License.'
    });

    this.addItem({
      id: 'fly-board-standard',
      name: 'Wooden Board',
      icon: '🛹',
      type: 'flying',
      count: 1,
      maxStack: 1,
      description: 'Standard flying board with smooth aerodynamics.'
    });

    this.addItem({
      id: 'sword-wooden',
      name: 'Wooden Sword',
      icon: '🗡️',
      type: 'weapon',
      count: 1,
      maxStack: 1,
      description: 'A simple practice wooden sword for Vagrants.'
    });
  }

  public getSlots(): InventorySlot[] {
    return this.slots;
  }

  public addItem(item: ItemData): boolean {
    // 1. Try stacking if consumable
    if (item.maxStack > 1) {
      for (const slot of this.slots) {
        if (slot.item && slot.item.id === item.id && slot.item.count < slot.item.maxStack) {
          const available = slot.item.maxStack - slot.item.count;
          const toAdd = Math.min(available, item.count);
          slot.item.count += toAdd;
          item.count -= toAdd;
          if (item.count <= 0) {
            this.notifyChanged();
            return true;
          }
        }
      }
    }

    // 2. Find empty slot
    for (const slot of this.slots) {
      if (slot.item === null) {
        slot.item = { ...item };
        this.notifyChanged();
        return true;
      }
    }

    return false; // Inventory full
  }

  public removeItem(slotIndex: number, count = 1): ItemData | null {
    const slot = this.slots[slotIndex];
    if (!slot || !slot.item) return null;

    if (slot.item.count > count) {
      slot.item.count -= count;
      const copy = { ...slot.item, count };
      this.notifyChanged();
      return copy;
    } else {
      const removed = slot.item;
      slot.item = null;
      this.notifyChanged();
      return removed;
    }
  }

  public swapSlots(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;
    const temp = this.slots[fromIndex].item;
    this.slots[fromIndex].item = this.slots[toIndex].item;
    this.slots[toIndex].item = temp;
    this.notifyChanged();
  }

  public setOnChangeCallback(callback: () => void): void {
    this.onInventoryChangedCallback = callback;
  }

  private notifyChanged(): void {
    if (this.onInventoryChangedCallback) {
      this.onInventoryChangedCallback();
    }
  }
}
