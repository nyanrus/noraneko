import assert from "node:assert";
import {ProcessPool, TestSpecification, Vitest, WorkspaceProject} from "vitest/node"

interface Project {
	project: WorkspaceProject;
	options: {};
	testFiles: Set<string>;
	relativePath: string | number;
}

const allProjects = new Map<string /* projectName */, Project>();

// async function runTests(
// 	ctx: Vitest,
// 	mf: Miniflare,
// 	workerName: string,
// 	project: Project,
// 	config: ResolvedConfig,
// 	files: string[],
// 	invalidates: string[] = []
// ) {
// 	let workerPath = path.join(ctx.distPath, "worker.js");
// 	let threadsWorkerPath = path.join(ctx.distPath, "workers", "threads.js");
// 	if (process.platform === "win32") {
// 		workerPath = `/${ensurePosixLikePath(workerPath)}`;
// 		threadsWorkerPath = `/${ensurePosixLikePath(threadsWorkerPath)}`;
// 	}

// 	ctx.state.clearFiles(project.project, files);
// 	const data: WorkerContext = {
// 		pool: "threads",
// 		worker: threadsWorkerPath,
// 		port: undefined as unknown as MessagePort,
// 		config,
// 		files,
// 		invalidates,
// 		environment: { name: "node", options: null },
// 		workerId: 0,
// 		projectName: project.project.getName(),
// 		providedContext: project.project.getProvidedContext(),
// 	};

// 	// We reset storage at the end of tests when the user is presumably looking at
// 	// results. We don't need to reset storage on the first run as instances were
// 	// just created.
// 	await waitForStorageReset(mf);
// 	const ns = await mf.getDurableObjectNamespace(
// 		RUNNER_OBJECT_BINDING,
// 		workerName
// 	);
// 	// @ts-expect-error `ColoLocalActorNamespace`s are not included in types
// 	const stub = ns.get("singleton");

// 	const res = await stub.fetch("http://placeholder", {
// 		headers: {
// 			Upgrade: "websocket",
// 			"MF-Vitest-Worker-Data": structuredSerializableStringify({
// 				filePath: workerPath,
// 				name: "run",
// 				data,
// 			}),
// 		},
// 	});
// 	const webSocket = res.webSocket;
// 	assert(webSocket !== null);

// 	const chunkingSocket = createChunkingSocket({
// 		post(message) {
// 			webSocket.send(message);
// 		},
// 		on(listener) {
// 			webSocket.addEventListener("message", (event) => {
// 				listener(event.data);
// 			});
// 		},
// 	});

// 	// Compile module rules for matching against
// 	const rules = project.options.miniflare?.modulesRules;
// 	const compiledRules = compileModuleRules(rules ?? []);

// 	const localRpcFunctions = createMethodsRPC(project.project);
// 	const patchedLocalRpcFunctions: RuntimeRPC = {
// 		...localRpcFunctions,
// 		async fetch(...args) {
// 			const specifier = args[0];

// 			// Mark built-in modules and any virtual modules (e.g. `cloudflare:test`)
// 			// as external
// 			if (
// 				/^(cloudflare|workerd):/.test(specifier) ||
// 				workerdBuiltinModules.has(specifier)
// 			) {
// 				return { externalize: specifier };
// 			}

// 			// If the specifier matches any module rules, force it to be loaded as
// 			// that type. This will be handled by the module fallback service.
// 			const maybeRule = compiledRules.find((rule) =>
// 				testRegExps(rule.include, specifier)
// 			);
// 			if (maybeRule !== undefined) {
// 				const externalize = specifier + `?mf_vitest_force=${maybeRule.type}`;
// 				return { externalize };
// 			}

// 			return localRpcFunctions.fetch(...args);
// 		},
// 	};

// 	let startupError: unknown;
// 	const rpc = createBirpc<RunnerRPC, RuntimeRPC>(patchedLocalRpcFunctions, {
// 		eventNames: ["onCancel"],
// 		post(value) {
// 			if (webSocket.readyState === WebSocket.READY_STATE_OPEN) {
// 				debuglog("POOL-->WORKER", value);
// 				chunkingSocket.post(structuredSerializableStringify(value));
// 			} else {
// 				debuglog("POOL--*      ", value);
// 			}
// 		},
// 		on(listener) {
// 			chunkingSocket.on((message) => {
// 				const value = structuredSerializableParse(message);
// 				debuglog("POOL<--WORKER", value);
// 				if (
// 					typeof value === "object" &&
// 					value !== null &&
// 					"vitestPoolWorkersError" in value
// 				) {
// 					startupError = value.vitestPoolWorkersError;
// 				} else {
// 					listener(value);
// 				}
// 			});
// 		},
// 	});
// 	project.project.ctx.onCancel((reason) => rpc.onCancel(reason));
// 	webSocket.accept();

// 	const [event] = (await events.once(webSocket, "close")) as [CloseEvent];
// 	if (webSocket.readyState === WebSocket.READY_STATE_CLOSING) {
// 		if (event.code === 1005 /* No Status Received */) {
// 			webSocket.close();
// 		} else {
// 			webSocket.close(event.code, event.reason);
// 		}
// 	}
// 	if (event.code !== 1000) {
// 		throw startupError ?? new Error("Failed to run tests");
// 	}

// 	debuglog("DONE", files);
// }

export default function (ctx: Vitest): ProcessPool {
	return {
		name: "vitest-pool-noraneko",
		async runTests(specs: TestSpecification[], invalidates) {
			// // 1. Collect new specs
			// const parsedProjectOptions = new Set<WorkspaceProject>();
			// for (const [project, testFile] of specs) {
			// 	// Vitest validates all project names are unique
			// 	const projectName = project.getName();
			// 	let workersProject = allProjects.get(projectName);
			// 	// Parse project options once per project per re-run
			// 	if (workersProject === undefined) {
			// 		workersProject = {
			// 			project,
			// 			options: await parseProjectOptions(project),
			// 			testFiles: new Set(),
			// 			relativePath: getRelativeProjectPath(project),
			// 		};
			// 		allProjects.set(projectName, workersProject);
			// 	} else if (!parsedProjectOptions.has(project)) {
			// 		workersProject.project = project;
			// 		workersProject.options = await parseProjectOptions(project);
			// 		workersProject.relativePath = getRelativeProjectPath(project);
			// 	}
			// 	workersProject.testFiles.add(testFile);

			// 	parsedProjectOptions.add(project);
			// }

			// // 2. Run just the required tests
			// const resultPromises: Promise<void>[] = [];
			// const filesByProject = new Map<WorkspaceProject, string[]>();
			// for (const [project, file] of specs) {
			// 	let group = filesByProject.get(project);
			// 	if (group === undefined) {
			// 		filesByProject.set(project, (group = []));
			// 	}
			// 	group.push(file);
			// }
			// for (const [workspaceProject, files] of filesByProject) {
			// 	const project = allProjects.get(workspaceProject.getName());
			// 	assert(project !== undefined); // Defined earlier in this function
			// 	const options = project.options;

			// 	const config = workspaceProject.getSerializableConfig();

			// 	// Use our custom test runner. We don't currently support custom
			// 	// runners, since we need our own for isolated storage/fetch mock resets
			// 	// to work properly. There aren't many use cases where a user would need
			// 	// to control this.
			// 	config.runner = "noraneko:test-runner";

			// 	// Make sure `setImmediate` and `clearImmediate` are never faked as they
			// 	// don't exist on the workers global scope
			// 	config.fakeTimers.toFake = config.fakeTimers.toFake?.filter(
			// 		(method) => method !== "setImmediate" && method !== "clearImmediate"
			// 	);

			// 	// We don't need all pool options from the config at runtime.
			// 	// Additionally, users may set symbols in the config which aren't
			// 	// serialisable. `getSerializableConfig()` may also return references to
			// 	// the same objects, so override it with a new object.
			// 	config.poolOptions = {
			// 		// @ts-expect-error Vitest provides no way to extend this type
			// 		threads: {
			// 			// Allow workers to be re-used by removing the isolation requirement
			// 			isolate: false,
			// 		},
			// 	};

			// 	const mf = await getProjectMiniflare(ctx, project);
			// 	if (options.singleWorker) {
			// 		// Single Worker, Isolated or Shared Storage
			// 		//  --> single instance with single runner worker
			// 		assert(mf instanceof Miniflare, "Expected single instance");
			// 		const name = getRunnerName(workspaceProject);
			// 		resultPromises.push(
			// 			runTests(ctx, mf, name, project, config, files, invalidates)
			// 		);
			// 	}
			// }

			// // 3. Wait for all tests to complete, and throw if any failed
			// const results = await Promise.allSettled(resultPromises);
			// const errors = results
			// 	.filter((r): r is PromiseRejectedResult => r.status === "rejected")
			// 	.map((r) => r.reason);

			// // 4. Clean up persistence directories. Note we do this in the background
			// //    at the end of tests as opposed to before tests start, so re-runs
			// //    start quickly, and results are displayed as soon as they're ready.
			// for (const project of allProjects.values()) {
			// 	if (project.mf !== undefined) {
			// 		void forEachMiniflare(project.mf, async (mf) =>
			// 			scheduleStorageReset(mf)
			// 		);
			// 	}
			// }

			// if (errors.length > 0) {
			// 	throw new AggregateError(
			// 		errors,
			// 		"Errors occurred while running tests. For more information, see serialized error."
			// 	);
			// }
		},
		async collectTests(specs, invalidates) {
			console.log(specs)
		},
		async close() {
			// // `close()` will be called when shutting down Vitest or updating config
			// log.debug("Shutting down runtimes...");
			// const promises: Promise<unknown>[] = [];
			// for (const project of allProjects.values()) {
			// 	if (project.mf !== undefined) {
			// 		promises.push(
			// 			forEachMiniflare(project.mf, async (mf) => {
			// 				// Finish in-progress storage resets before disposing
			// 				await waitForStorageReset(mf);
			// 				await mf.dispose();
			// 			})
			// 		);
			// 	}
			// }
			// allProjects.clear();
			// await Promise.all(promises);
		},
	}
}