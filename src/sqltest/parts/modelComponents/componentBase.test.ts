/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { Mock, It, Times, MockBehavior } from 'typemoq';
import { ComponentBase, ContainerBase } from 'sql/parts/modelComponents/componentBase';
import { IComponentDescriptor, IModelStore, ComponentEventType } from 'sql/parts/modelComponents/interfaces';
import { ModelStore } from 'sql/parts/modelComponents/modelStore';
import { ChangeDetectorRef } from '@angular/core';

'use strict';

class TestComponent extends ComponentBase {
	public descriptor: IComponentDescriptor;

	constructor(public modelStore: IModelStore, id: string) {
		super(undefined);
		this.descriptor = modelStore.createComponentDescriptor('TestComponent', id);
		this.baseInit();
	}

	ngOnInit() { }
	setLayout() { }

	public addValidation(validation: () => boolean | Thenable<boolean>) {
		this._validations.push(validation);
	}
}

class TestContainer extends ContainerBase<TestComponent> {
	public descriptor: IComponentDescriptor;

	constructor(public modelStore: IModelStore, id: string) {
		super(undefined);
		this.descriptor = modelStore.createComponentDescriptor('TestContainer', id);
		this._changeRef = {
			detectChanges: () => undefined
		} as ChangeDetectorRef;
		this.baseInit();
	}

	ngOnInit() { }
	setLayout() { }

	public addValidation(validation: () => boolean | Thenable<boolean>) {
		this._validations.push(validation);
	}
}

suite('ComponentBase Tests', () => {
	let testComponent: TestComponent;
	let testContainer: TestContainer;
	let modelStore: IModelStore;

	setup(() => {
		modelStore = new ModelStore();
		testComponent = new TestComponent(modelStore, 'testComponent');
		testContainer = new TestContainer(modelStore, 'testContainer');
	});

	test('Component validation runs external validations stored in the model store', done => {
		assert.equal(testComponent.valid, true, 'Test component validity did not default to true');
		let validationCalls = 0;
		modelStore.registerValidationCallback(componentId => {
			validationCalls += 1;
			return Promise.resolve(false);
		});

		testComponent.validate().then(valid => {
			try {
				assert.equal(validationCalls, 1, 'External validation was not called once');
				assert.equal(valid, false, 'Validate call did not return correct value from the external validation');
				assert.equal(testComponent.valid, false, 'Validate call did not update the component valid property');
				done();
			} catch (err) {
				done(err);
			}
		}, err => done(err));
	});

	test('Component validation runs default component validations', done => {
		assert.equal(testComponent.valid, true, 'Test component validity did not default to true');
		let validationCalls = 0;
		testComponent.addValidation(() => {
			validationCalls += 1;
			return false;
		});

		testComponent.validate().then(valid => {
			try {
				assert.equal(validationCalls, 1, 'Default validation was not called once');
				assert.equal(valid, false, 'Validate call did not return correct value from the default validation');
				assert.equal(testComponent.valid, false, 'Validate call did not update the component valid property');
				done();
			} catch (err) {
				done(err);
			}
		}, err => done(err));
	});

	test('Container validation reflects child component validity', done => {
		assert.equal(testContainer.valid, true, 'Test container validity did not default to true');
		testContainer.addToContainer(testComponent.descriptor, undefined);
		testComponent.addValidation(() => false);
		testComponent.validate().then(() => {
			testContainer.validate().then(valid => {
				assert.equal(valid, false, 'Validate call did not return correct value for container child validation');
				assert.equal(testContainer.valid, false, 'Validate call did not update the container valid property');
				done();
			}, err => done(err));
		}, err => done(err));
	});

	test('Container child validity changes cause the parent container validity to change', done => {
		testContainer.registerEventHandler(event => {
			try {
				if (event.eventType === ComponentEventType.validityChanged) {
					assert.equal(testContainer.valid, false, 'Test container validity did not change to false when child validity changed');
					assert.equal(event.args, false, 'ValidityChanged event did not contain the updated container validity');
					done();
				}
			} catch (err) {
				done(err);
			}
		});
		testComponent.addValidation(() => false);
		testContainer.addToContainer(testComponent.descriptor, undefined);
		testComponent.validate();
	});

	test('Component convert size should add px', done => {
		let expected = '100px';
		let actual = testComponent.convertSize(100);
		assert.equal(expected, actual);

		actual = testComponent.convertSize('100px');
		assert.equal(expected, actual);

		expected = '100%';
		actual = testComponent.convertSize('100%');
		assert.equal(expected, actual);
		done();
	});

	test('Component convert size should keep value if ends with %', done => {
		let expected = '100%';
		let actual = testComponent.convertSize('100%');
		assert.equal(expected, actual);
		done();
	});

	test('Component convert size should return the default value given undefined value %', done => {
		let expected = '200';
		let actual = testComponent.convertSize(undefined, '200');
		assert.equal(expected, actual);
		done();
	});

	test('Component convert to number should return size without px', done => {
		let expected = 200;
		let actual = testComponent.convertSizeToNumber('200px');
		assert.equal(expected, actual);

		actual = testComponent.convertSizeToNumber('200');
		assert.equal(expected, actual);
		done();
	});

	test('Component convert to number should return 0 given undefined', done => {
		let expected = 0;
		let actual = testComponent.convertSizeToNumber(undefined);
		assert.equal(expected, actual);

		done();
	});

});