import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import type { Task } from "@prisma/client";

vi.mock("../../services/task.service.js", () => ({
	findAll: vi.fn(),
	findById: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	remove: vi.fn(),
}));

import * as taskService from "../../services/task.service.js";
import * as taskController from "../../controllers/task.controller.js";

const mockService = vi.mocked(taskService);

const mockTask: Task = {
	id: 1,
	title: "Test Task",
	description: "Test description",
	completed: false,
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function createMockResponse(): Response {
	return {
		status: vi.fn().mockReturnThis(),
		json: vi.fn().mockReturnThis(),
		send: vi.fn().mockReturnThis(),
	} as unknown as Response;
}

function createMockRequest(overrides: Partial<Request> = {}): Request {
	return {
		params: {},
		body: {},
		query: {},
		...overrides,
	} as unknown as Request;
}

describe("TaskController", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("getAllTasks", () => {
		it("returns 200 with all tasks", async () => {
			const tasks = [mockTask];
			mockService.findAll.mockResolvedValue(tasks);
			const req = createMockRequest();
			const res = createMockResponse();

			await taskController.getAllTasks(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(tasks);
		});

		it("returns 500 when the service fails", async () => {
			mockService.findAll.mockRejectedValueOnce(new Error("db failed"));
			const req = createMockRequest();
			const res = createMockResponse();

			await taskController.getAllTasks(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch tasks" });
		});
	});

	describe("getTaskById", () => {
		it("returns 400 for an invalid id", async () => {
			const req = createMockRequest({ params: { id: "abc" } });
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
		});

		it("returns 404 when the task does not exist", async () => {
			mockService.findById.mockResolvedValueOnce(null);
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(mockService.findById).toHaveBeenCalledWith(1);
			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
		});

		it("returns 200 with the task", async () => {
			mockService.findById.mockResolvedValueOnce(mockTask);
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(mockTask);
		});

		it("returns 500 when the service fails", async () => {
			mockService.findById.mockRejectedValueOnce(new Error("db failed"));
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.getTaskById(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ error: "Failed to fetch task" });
		});
	});

	describe("createTask", () => {
		it("returns 400 when title is missing", async () => {
			const req = createMockRequest({ body: {} });
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({
				error: "Title is required and must be a non-empty string",
			});
		});

		it("trims the title before creating the task", async () => {
			mockService.create.mockResolvedValueOnce(mockTask);
			const req = createMockRequest({
				body: { title: "  New task  ", description: "Details" },
			});
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(mockService.create).toHaveBeenCalledWith({
				title: "New task",
				description: "Details",
			});
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith(mockTask);
		});

		it("returns 500 when creation fails", async () => {
			mockService.create.mockRejectedValueOnce(new Error("db failed"));
			const req = createMockRequest({ body: { title: "Task" } });
			const res = createMockResponse();

			await taskController.createTask(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ error: "Failed to create task" });
		});
	});

	describe("updateTask", () => {
		it("returns 400 for an invalid id", async () => {
			const req = createMockRequest({ params: { id: "abc" }, body: {} });
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
		});

		it("returns 404 when the task does not exist", async () => {
			mockService.update.mockRejectedValueOnce(new Error("Task not found"));
			const req = createMockRequest({ params: { id: "1" }, body: { title: "Updated" } });
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
		});

		it("returns 200 with the updated task", async () => {
			const updatedTask = { ...mockTask, title: "Updated task" };
			mockService.update.mockResolvedValueOnce(updatedTask);
			const req = createMockRequest({
				params: { id: "1" },
				body: { title: "Updated task", completed: true },
			});
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(mockService.update).toHaveBeenCalledWith(1, {
				title: "Updated task",
				description: undefined,
				completed: true,
			});
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(updatedTask);
		});

		it("returns 500 when the service fails unexpectedly", async () => {
			mockService.update.mockRejectedValueOnce(new Error("db failed"));
			const req = createMockRequest({ params: { id: "1" }, body: { title: "Updated" } });
			const res = createMockResponse();

			await taskController.updateTask(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ error: "Failed to update task" });
		});
	});

	describe("deleteTask", () => {
		it("returns 400 for an invalid id", async () => {
			const req = createMockRequest({ params: { id: "abc" } });
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({ error: "Invalid task ID" });
		});

		it("returns 404 when the task does not exist", async () => {
			mockService.remove.mockRejectedValueOnce(new Error("Task not found"));
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith({ error: "Task not found" });
		});

		it("returns 204 when the task is deleted", async () => {
			mockService.remove.mockResolvedValueOnce(mockTask);
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(mockService.remove).toHaveBeenCalledWith(1);
			expect(res.status).toHaveBeenCalledWith(204);
			expect(res.send).toHaveBeenCalledWith();
		});

		it("returns 500 when deletion fails unexpectedly", async () => {
			mockService.remove.mockRejectedValueOnce(new Error("db failed"));
			const req = createMockRequest({ params: { id: "1" } });
			const res = createMockResponse();

			await taskController.deleteTask(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({ error: "Failed to delete task" });
		});
	});
});
