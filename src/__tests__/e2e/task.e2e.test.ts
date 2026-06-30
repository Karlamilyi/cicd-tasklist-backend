import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { vi } from "vitest";
import request from "supertest";
import testPrisma from "./setup.js";

vi.mock("../../lib/prisma.js", () => ({
	default: testPrisma,
}));

const { default: app } = await import("../../app.js");

type TaskPayload = {
	title: string;
	description?: string;
	completed?: boolean;
};

async function createTask(payload: TaskPayload) {
	return request(app).post("/api/tasks").send(payload);
}

describe("Task API E2E Tests", () => {
	beforeEach(async () => {
		await testPrisma.task.deleteMany();
	});

	afterAll(async () => {
		await testPrisma.$disconnect();
	});

	it("creates and lists tasks", async () => {
		await createTask({ title: "First task", description: "First description" });
		await createTask({ title: "Second task", description: "Second description" });

		const res = await request(app).get("/api/tasks");

		expect(res.status).toBe(200);
		expect(res.body).toHaveLength(2);
		expect(res.body[0].title).toBe("Second task");
		expect(res.body[1].title).toBe("First task");
	});

	it("rejects invalid task creation payloads", async () => {
		const res = await createTask({ title: "   " });

		expect(res.status).toBe(400);
		expect(res.body).toEqual({
			error: "Title is required and must be a non-empty string",
		});
	});

	it("gets, updates, and deletes a task", async () => {
		const createRes = await createTask({ title: "Lifecycle task", description: "Start" });
		const taskId = createRes.body.id;

		const getRes = await request(app).get(`/api/tasks/${taskId}`);
		expect(getRes.status).toBe(200);
		expect(getRes.body.title).toBe("Lifecycle task");

		const updateRes = await request(app)
			.put(`/api/tasks/${taskId}`)
			.send({ title: "Updated lifecycle task", completed: true });

		expect(updateRes.status).toBe(200);
		expect(updateRes.body.title).toBe("Updated lifecycle task");
		expect(updateRes.body.completed).toBe(true);

		const deleteRes = await request(app).delete(`/api/tasks/${taskId}`);
		expect(deleteRes.status).toBe(204);

		const missingRes = await request(app).get(`/api/tasks/${taskId}`);
		expect(missingRes.status).toBe(404);
		expect(missingRes.body).toEqual({ error: "Task not found" });
	});

	it("returns 400 for invalid ids on read, update, and delete", async () => {
		const getRes = await request(app).get("/api/tasks/not-a-number");
		const updateRes = await request(app).put("/api/tasks/not-a-number").send({ title: "x" });
		const deleteRes = await request(app).delete("/api/tasks/not-a-number");

		expect(getRes.status).toBe(400);
		expect(updateRes.status).toBe(400);
		expect(deleteRes.status).toBe(400);
	});

	it("returns 404 for unknown task ids on update and delete", async () => {
		const updateRes = await request(app)
			.put("/api/tasks/999999")
			.send({ title: "Missing task" });
		const deleteRes = await request(app).delete("/api/tasks/999999");

		expect(updateRes.status).toBe(404);
		expect(updateRes.body).toEqual({ error: "Task not found" });
		expect(deleteRes.status).toBe(404);
		expect(deleteRes.body).toEqual({ error: "Task not found" });
	});
});
