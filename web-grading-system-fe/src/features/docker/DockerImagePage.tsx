"use client"

import { useCallback, useEffect, useState } from 'react'
import { isCancel } from 'axios'
import { Table, Button, Space, Modal, Form, Input, message, Popconfirm, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import {
  listDockerImages,
  createDockerImage,
  updateDockerImage,
  deleteDockerImage,
} from '../../shared/api/endpoints/assignments'
import { useApiErrorMessage } from '../../shared/api/errors'
import type { DockerImageResponse } from '../../shared/types/assignment'

export function DockerImagePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toMessage = useApiErrorMessage()
  const [data, setData] = useState<DockerImageResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<DockerImageResponse | null>(null)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  // Review: 2026-10-05, Pullfrog — the table stayed on a spinner because only mutations triggered a load.
  const load = useCallback((signal?: AbortSignal) => {
    setLoading(true)
    listDockerImages(undefined, undefined, undefined, { signal })
      .then((resp) => {
        if (signal?.aborted) return
        setData(resp.result)
      })
      .catch((err: unknown) => {
        if (signal?.aborted || isCancel(err)) return
        message.error(toMessage(err))
      })
      .finally(() => {
        if (signal?.aborted) return
        setLoading(false)
      })
  }, [toMessage])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const handleCreate = async (values: { name: string; imageUrl: string; description?: string }) => {
    setSaving(true)
    try {
      await createDockerImage(values)
      message.success(t('common.created'))
      setModalOpen(false)
      form.resetFields()
      load()
    } catch (err: unknown) {
      message.error(toMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (values: { name?: string; imageUrl?: string; description?: string }) => {
    if (!editing) return
    setSaving(true)
    try {
      await updateDockerImage(editing.id, values)
      message.success(t('common.updated'))
      setModalOpen(false)
      setEditing(null)
      form.resetFields()
      load()
    } catch (err: unknown) {
      message.error(toMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDockerImage(id)
      message.success(t('common.deleted'))
      load()
    } catch (err: unknown) {
      message.error(toMessage(err))
    }
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (item: DockerImageResponse) => {
    setEditing(item)
    form.setFieldsValue({ name: item.name, imageUrl: item.imageUrl, description: item.description })
    setModalOpen(true)
  }

  const columns = [
    { title: t('assignment.name'), dataIndex: 'name', key: 'name' },
    { title: t('assignment.image'), dataIndex: 'imageUrl', key: 'imageUrl', render: (v: string) => <code>{v}</code> },
    { title: t('assignment.description'), dataIndex: 'description', key: 'description' },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_: unknown, record: DockerImageResponse) => (
        <Space size={8}>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            {t('common.edit')}
          </Button>
          <Popconfirm title={t('common.delete')} onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger size="small">
              {t('common.delete')}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Button onClick={() => navigate(-1)}>← {t('common.back')}</Button>
        <Typography.Title level={4} style={{ margin: 0 }}>{t('assignment.dockerImages')}</Typography.Title>
      </div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Button type="primary" onClick={openCreate}>{t('assignment.create')}</Button>
      </div>
      <Table<DockerImageResponse>
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={false}
        size="middle"
      />

      <Modal
        open={modalOpen}
        title={editing ? t('common.edit') : t('assignment.create')}
        onCancel={() => { setModalOpen(false); setEditing(null) }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editing ? handleUpdate : handleCreate}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="name" label={t('assignment.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="imageUrl" label={t('assignment.imageUrl')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('assignment.description')}>
            <Input.TextArea />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>
              {t('common.save')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}