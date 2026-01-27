import {
  CreateShoppingListItemDto,
  ShoppingListItemEntity,
  ShoppingListItemResponseDto,
  UpdateShoppingListItemDto,
} from '@app/entity-data-models';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ShoppingListService {
  constructor(
    @InjectRepository(ShoppingListItemEntity)
    private readonly shoppingListRepo: Repository<ShoppingListItemEntity>,
  ) {}

  async addToShoppingList(
    dto: CreateShoppingListItemDto,
  ): Promise<ShoppingListItemResponseDto> {
    const existing = await this.shoppingListRepo.findOne({
      where: {
        userId: dto.userId,
        productCode: dto.productCode,
      },
    });

    if (existing) {
      existing.quantity = Number(existing.quantity) + Number(dto.quantity);
      const updated = await this.shoppingListRepo.save(existing);
      return this.mapShoppingListItemToDto(updated);
    }

    const item = this.shoppingListRepo.create(dto);
    const saved = await this.shoppingListRepo.save(item);
    return this.mapShoppingListItemToDto(saved);
  }

  async getShoppingList(
    userId: string,
  ): Promise<ShoppingListItemResponseDto[]> {
    const items = await this.shoppingListRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return items.map(item => this.mapShoppingListItemToDto(item));
  }

  async getShoppingListByStatus(
    userId: string,
    purchased: boolean,
  ): Promise<ShoppingListItemResponseDto[]> {
    const items = await this.shoppingListRepo.find({
      where: { userId, purchased },
      order: { createdAt: 'DESC' },
    });

    return items.map(item => this.mapShoppingListItemToDto(item));
  }

  async updateShoppingListItem(
    itemId: string,
    dto: UpdateShoppingListItemDto,
    userId: string,
  ): Promise<ShoppingListItemResponseDto> {
    const item = await this.shoppingListRepo.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(
        `Item de lista de compras no encontrado: ${itemId}`,
      );
    }

    if (item.userId !== userId) {
      throw new NotFoundException('No tienes permiso para modificar este item');
    }

    if (dto.quantity !== undefined) item.quantity = dto.quantity;
    if (dto.unit !== undefined) item.unit = dto.unit;
    if (dto.customUnitName !== undefined)
      item.customUnitName = dto.customUnitName;
    if (dto.customUnitGrams !== undefined)
      item.customUnitGrams = dto.customUnitGrams;
    if (dto.purchased !== undefined) item.purchased = dto.purchased;

    const updated = await this.shoppingListRepo.save(item);
    return this.mapShoppingListItemToDto(updated);
  }

  async togglePurchased(
    itemId: string,
    userId: string,
  ): Promise<ShoppingListItemResponseDto> {
    const item = await this.shoppingListRepo.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(
        `Item de lista de compras no encontrado: ${itemId}`,
      );
    }

    if (item.userId !== userId) {
      throw new NotFoundException('No tienes permiso para modificar este item');
    }

    item.purchased = !item.purchased;

    await this.shoppingListRepo.save(item);

    const updated = await this.shoppingListRepo.findOne({
      where: { id: itemId },
    });

    if (!updated) {
      throw new NotFoundException('Error al actualizar el item');
    }

    return this.mapShoppingListItemToDto(updated);
  }

  async deleteShoppingListItem(itemId: string, userId: string): Promise<void> {
    const item = await this.shoppingListRepo.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(
        `Item de lista de compras no encontrado: ${itemId}`,
      );
    }

    if (item.userId !== userId) {
      throw new NotFoundException('No tienes permiso para eliminar este item');
    }

    await this.shoppingListRepo.delete(itemId);
  }

  async clearPurchasedItems(userId: string): Promise<number> {
    const result = await this.shoppingListRepo.delete({
      userId,
      purchased: true,
    });

    return result.affected || 0;
  }

  async clearShoppingList(userId: string): Promise<number> {
    const result = await this.shoppingListRepo.delete({ userId });
    return result.affected || 0;
  }

  async getShoppingListCount(userId: string): Promise<number> {
    return this.shoppingListRepo.count({ where: { userId } });
  }

  async validateShoppingListOwnership(
    itemId: string,
    userId: string,
  ): Promise<boolean> {
    const item = await this.shoppingListRepo.findOne({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(
        `Item de lista de compras no encontrado: ${itemId}`,
      );
    }

    if (item.userId !== userId) {
      throw new NotFoundException('No tienes permiso para acceder a este item');
    }

    return true;
  }

  private mapShoppingListItemToDto(
    item: ShoppingListItemEntity,
  ): ShoppingListItemResponseDto {
    return {
      id: item.id,
      userId: item.userId,
      productCode: item.productCode,
      productName: item.productName,
      productImage: item.productImage,
      quantity: Number(item.quantity),
      unit: item.unit,
      customUnitName: item.customUnitName,
      customUnitGrams: item.customUnitGrams
        ? Number(item.customUnitGrams)
        : undefined,
      purchased: item.purchased,
      createdAt: item.createdAt,
    };
  }
}
