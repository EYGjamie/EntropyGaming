import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
  ) {}

  async create(createCommentDto: CreateCommentDto, authorId: number): Promise<Comment> {
    const comment = this.commentsRepository.create({
      ...createCommentDto,
      authorId,
    });
    return this.commentsRepository.save(comment);
  }

  async findAll(
    entityType?: string, 
    entityId?: string,
    includePrivate: boolean = false
  ): Promise<Comment[]> {
    const queryBuilder = this.commentsRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.author', 'author')
      .leftJoinAndSelect('author.role', 'role')
      .orderBy('comment.createdAt', 'DESC');

    if (entityType) {
      queryBuilder.andWhere('comment.entityType = :entityType', { entityType });
    }

    if (entityId) {
      queryBuilder.andWhere('comment.entityId = :entityId', { entityId });
    }

    if (!includePrivate) {
      queryBuilder.andWhere('comment.isPrivate = :isPrivate', { isPrivate: false });
    }

    return queryBuilder.getMany();
  }

  async findForEntity(entityType: string, entityId: string, includePrivate: boolean = false): Promise<Comment[]> {
    return this.findAll(entityType, entityId, includePrivate);
  }

  async findOne(id: number): Promise<Comment> {
    const comment = await this.commentsRepository.findOne({
      where: { id },
      relations: ['author', 'author.role'],
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    return comment;
  }

  async update(
    id: number, 
    updateCommentDto: UpdateCommentDto, 
    userId: number,
    userPermissions: string[]
  ): Promise<Comment> {
    const comment = await this.findOne(id);

    // Check if user can edit this comment
    const canEdit = comment.authorId === userId || userPermissions.includes('comments.moderate');
    if (!canEdit) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    // Update the comment
    await this.commentsRepository.update(id, {
      ...updateCommentDto,
      isEdited: true,
    });

    return this.findOne(id);
  }

  async remove(id: number, userId: number, userPermissions: string[]): Promise<void> {
    const comment = await this.findOne(id);

    // Check if user can delete this comment
    const canDelete = comment.authorId === userId || userPermissions.includes('comments.moderate');
    if (!canDelete) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentsRepository.remove(comment);
  }

  async getCommentStats(): Promise<any> {
    const totalComments = await this.commentsRepository.count();
    const privateComments = await this.commentsRepository.count({ where: { isPrivate: true } });
    const editedComments = await this.commentsRepository.count({ where: { isEdited: true } });

    return {
      total: totalComments,
      private: privateComments,
      public: totalComments - privateComments,
      edited: editedComments,
    };
  }

  async getCommentsByEntityType(): Promise<Record<string, number>> {
    const result = await this.commentsRepository
      .createQueryBuilder('comment')
      .select('comment.entityType', 'entityType')
      .addSelect('COUNT(*)', 'count')
      .groupBy('comment.entityType')
      .getRawMany();

    return result.reduce((acc, item) => {
      acc[item.entityType] = parseInt(item.count);
      return acc;
    }, {});
  }
}