import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Task } from "@prisma/client";

vi.mock("../../lib/prisma.js", () => {
	return {
		default: {
			task: {
				findMany: vi.fn(),
				findUnique: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				delete: vi.fn(),
			},
		},
	};
});

import prisma from "../../lib/prisma.js";
import * as taskService from "../../services/task.service.js";

const mockTask: Task = {
	id: 1,
	title: "Test Task",
	description: "A test task description",
	completed: false,
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("TaskService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("findAll", () => {
		it("returns all tasks ordered by createdAt desc", async () => {
			const tasks = [mockTask];
			vi.mocked(prisma.task.findMany).mockResolvedValueOnce(tasks);

			const result = await taskService.findAll();

			expect(result).toEqual(tasks);
			expect(prisma.task.findMany).toHaveBeenCalledWith({
				orderBy: { createdAt: "desc" },
			});
		});
	});

	describe("findById", () => {
		it("returns a task by id", async () => {
			vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(mockTask);

			const result = await taskService.findById(1);

			expect(result).toEqual(mockTask);
			expect(prisma.task.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
		});
	});

	describe("create", () => {
		it("creates a task with title and optional description", async () => {
			vi.mocked(prisma.task.create).mockResolvedValueOnce(mockTask);

			const result = await taskService.create({
				title: "New task",
				description: "Description",
			});

			expect(result).toEqual(mockTask);
			expect(prisma.task.create).toHaveBeenCalledWith({
				data: {
					title: "New task",
					description: "Description",
				},
			});
		});
	});

	describe("update", () => {
		it("throws when the task does not exist", async () => {
			vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(null);

			await expect(taskService.update(1, { title: "Updated" })).rejects.toThrow(
				"Task not found"
			);
			expect(prisma.task.update).not.toHaveBeenCalled();
		});

		it("updates an existing task", async () => {
			const updatedTask = { ...mockTask, title: "Updated task" };
			vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(mockTask);
			vi.mocked(prisma.task.update).mockResolvedValueOnce(updatedTask);

			const result = await taskService.update(1, {
				title: "Updated task",
				completed: true,
			});

			expect(result).toEqual(updatedTask);
			expect(prisma.task.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
			expect(prisma.task.update).toHaveBeenCalledWith({
				where: { id: 1 },
				data: {
					title: "Updated task",
					completed: true,
				},
			});
		});
	});

	describe("remove", () => {
		it("throws when the task does not exist", async () => {
			vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(null);

			await expect(taskService.remove(1)).rejects.toThrow("Task not found");
			expect(prisma.task.delete).not.toHaveBeenCalled();
		});

		it("deletes an existing task", async () => {
			vi.mocked(prisma.task.findUnique).mockResolvedValueOnce(mockTask);
			vi.mocked(prisma.task.delete).mockResolvedValueOnce(mockTask);

			const result = await taskService.remove(1);

			expect(result).toEqual(mockTask);
			expect(prisma.task.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
			expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 1 } });
		});
	});
});
